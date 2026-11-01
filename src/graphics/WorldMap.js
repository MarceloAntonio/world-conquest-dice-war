import * as THREE from 'three';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geoNaturalEarth1, geoPath } from 'd3-geo';

export class WorldMap {
  constructor(container,data,onSelect,onHover,settings){
    this.container=container;this.data=data;this.settings=settings;this.onSelect=onSelect;this.onHover=onHover;
    this.projection=geoNaturalEarth1().scale(310).translate([0,0]).reflectY(true);
    this.path=geoPath(this.projection);this.meshes=new Map();this.textures=new Map();this.markers=[];this.hitTargets=[];this.effects=[];this.boundaries=[];this.particles=[];
    this.scene=new THREE.Scene();this.root=new THREE.Group();this.scene.add(this.root);
    this.camera=new THREE.OrthographicCamera(-900,900,450,-450,1,3000);this.camera.position.z=1400;
    this.target={x:0,y:15,zoom:0.92};this.camera.zoom=this.target.zoom;this.hover=null;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality==='low'||settings.quality==='auto'&&(navigator.deviceMemory??8)<=4?1:2));
    this.renderer.setClearColor(0x000000,0);container.appendChild(this.renderer.domElement);
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();
    this.resizeObserver=new ResizeObserver(()=>this.resize());this.resizeObserver.observe(container);
    this.bind();this.resize();this.last=performance.now();
    this.animate=this.animate.bind(this);this.frame=requestAnimationFrame(this.animate);
  }
  async init(){
    await Promise.all(this.data.countries.map(async c=>{
      const image=new Image();image.src=import.meta.env.BASE_URL+c.flag;await image.decode();
      const canvas=document.createElement('canvas');canvas.width=128;canvas.height=96;
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,128,96);
      const texture=new THREE.CanvasTexture(canvas);texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.LinearFilter;texture.colorSpace=THREE.SRGBColorSpace;
      this.textures.set(c.id,texture);
    }));
    const loader=new SVGLoader();
    for(const feature of this.data.world.features){
      const id=feature.properties.id;
      const svg=loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${this.path(feature)}" fill="#fff" fill-rule="evenodd"/></svg>`);
      const shapes=svg.paths.flatMap(p=>SVGLoader.createShapes(p));
      const geoms=[],contours=[];
      for(const shape of shapes){
        const geo=new THREE.ShapeGeometry(shape);geo.computeBoundingBox();
        const box=geo.boundingBox;const w=Math.max(box.max.x-box.min.x,0.01),h=Math.max(box.max.y-box.min.y,0.01);
        // Fit one recognizable flag into each polygon, including offshore parts.
        const positions=geo.attributes.position,uv=geo.attributes.uv;
        for(let i=0;i<positions.count;i++)uv.setXY(i,(positions.getX(i)-box.min.x)/w,(positions.getY(i)-box.min.y)/h);
        geoms.push(geo);
        for(const ring of [shape,...shape.holes]){
          const points=ring.getPoints();
          for(let i=1;i<points.length;i++)contours.push(points[i-1].x,points[i-1].y,2.1,points[i].x,points[i].y,2.1);
        }
      }
      if(!geoms.length)throw Error(`Geometria não renderizável: ${id}`);
      const geometry=mergeGeometries(geoms);geoms.forEach(g=>g.dispose());
      const material=new THREE.MeshBasicMaterial({map:this.textures.get(id),color:0xc4d3df,side:THREE.DoubleSide});
      const uniforms={previousMap:{value:this.textures.get(id)},conquestProgress:{value:1}};
      material.onBeforeCompile=shader=>{
        Object.assign(shader.uniforms,uniforms);
        shader.fragmentShader='uniform sampler2D previousMap;\nuniform float conquestProgress;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`#ifdef USE_MAP
          vec4 nextFlag = texture2D(map, vMapUv);
          vec4 previousFlag = texture2D(previousMap, vMapUv);
          vec2 pixelCell = floor(vMapUv * 96.0);
          float pixelNoise = fract(sin(dot(pixelCell, vec2(12.9898,78.233))) * 43758.5453) * 0.12;
          float edge = vMapUv.x * 0.85 + pixelNoise;
          diffuseColor *= mix(previousFlag, nextFlag, smoothstep(edge, edge + 0.04, conquestProgress));
        #endif`);
      };
      const mesh=new THREE.Mesh(geometry,material);mesh.position.z=1.8;mesh.userData={id};
      const side=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x030e1e,side:THREE.DoubleSide}));side.position.set(0,-3.5,-0.5);
      const linesGeo=new THREE.BufferGeometry();linesGeo.setAttribute('position',new THREE.Float32BufferAttribute(contours,3));
      const line=new THREE.LineSegments(linesGeo,new THREE.LineBasicMaterial({color:0x102b43,transparent:true,opacity:0}));
      this.root.add(side,mesh,line);this.hitTargets.push(mesh);
      const c=this.data.countries.find(c=>c.id===id);
      const position=this.projection(c.label);
      // Always-selectable tiny-state rings with a transparent enlarged hit disk.
      let marker=null;
      if(c.areaKm2<3500){
        marker=new THREE.Mesh(new THREE.RingGeometry(2.4,3.6,12),new THREE.MeshBasicMaterial({color:0xa7c4d5,transparent:true,opacity:0.7,depthTest:false}));
        marker.position.set(...position,5);marker.renderOrder=5;
        const hit=new THREE.Mesh(new THREE.CircleGeometry(6,12),new THREE.MeshBasicMaterial({visible:false}));hit.position.copy(marker.position);hit.userData={id};
        this.root.add(marker,hit);this.hitTargets.push(hit);this.markers.push(marker);
      }
      this.meshes.set(id,{mesh,line,side,marker,position,owner:id,uniforms});
    }
    for(const feature of this.data.boundaries.features){
      const points=[];
      const svg=loader.parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${this.path(feature)}" fill="none" stroke="#fff"/></svg>`);
      for(const path of svg.paths)for(const subPath of path.subPaths){const ps=subPath.getPoints();for(let i=1;i<ps.length;i++)points.push(ps[i-1].x,ps[i-1].y,3,ps[i].x,ps[i].y,3);}
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points,3));
      const line=new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:feature.properties.b?0x0c2030:0x294252,transparent:true,opacity:0.85}));
      this.root.add(line);this.boundaries.push({...feature.properties,line});
    }
    this.ready=true;
  }
  resize(){
    const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;
    this.renderer.setSize(w,h);const ratio=w/h;
    const height=Math.max(770,1800/ratio);
    this.camera.left=-height*ratio/2;this.camera.right=height*ratio/2;this.camera.top=height/2;this.camera.bottom=-height/2;this.camera.updateProjectionMatrix();
  }
  bind(){
    const el=this.renderer.domElement;let down=null;
    el.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY,tx:this.target.x,ty:this.target.y,moved:false};el.setPointerCapture(e.pointerId);});
    el.addEventListener('pointermove',e=>{
      if(down){const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.abs(dx)+Math.abs(dy)>4)down.moved=true;const scale=(this.camera.right-this.camera.left)/el.clientWidth/this.target.zoom;this.target.x=down.tx-dx*scale;this.target.y=down.ty+dy*scale;return;}
      const id=this.pick(e);this.highlight(id);this.onHover(id,e);el.style.cursor=id?'pointer':'grab';
    });
    el.addEventListener('pointerup',e=>{if(down&&!down.moved){const id=this.pick(e);if(id)this.onSelect(id);}down=null;});
    el.addEventListener('pointercancel',()=>down=null);
    el.addEventListener('pointerleave',()=>{this.highlight(null);this.onHover(null);});
    el.addEventListener('wheel',e=>{e.preventDefault();this.zoom(e.deltaY>0?0.9:1.1);},{passive:false});
    el.addEventListener('dblclick',()=>this.reset());
  }
  pick(event){
    if(!this.ready)return null;
    const rect=this.renderer.domElement.getBoundingClientRect();this.pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
    this.raycaster.setFromCamera(this.pointer,this.camera);return this.raycaster.intersectObjects(this.hitTargets,false)[0]?.object.userData.id??null;
  }
  highlight(id){
    if(this.hover===id)return;
    if(this.hover){const old=this.meshes.get(this.hover);if(old){old.line.material.color.setHex(0x102b43);old.line.material.opacity=0;old.line.position.z=0;old.mesh.material.color.setHex(0xc4d3df);}}
    this.hover=id;
    if(id){const m=this.meshes.get(id);m.line.material.color.setHex(0xc5f7da);m.line.material.opacity=1;m.line.position.z=3;m.mesh.material.color.setHex(0xffffff);}
  }
  update(owners,animate=false,conquered=[]){
    if(!animate){this.effects=[];for(const m of this.meshes.values()){m.uniforms.conquestProgress.value=1;m.mesh.position.z=1.8;m.mesh.material.color.setHex(0xc4d3df);m.line.material.opacity=0;}}
    for(const [id,m] of this.meshes){
      const owner=owners[id];if(m.owner===owner)continue;
      m.uniforms.previousMap.value=m.mesh.material.map;m.uniforms.conquestProgress.value=animate?0:1;
      m.owner=owner;m.mesh.material.map=this.textures.get(owner);m.mesh.material.needsUpdate=true;
      if(animate&&conquered.includes(id))this.effects.push({id,start:performance.now()});
    }
    for(const boundary of this.boundaries)boundary.line.visible=!boundary.b||owners[boundary.a]!==owners[boundary.b];
    if(animate&&this.settings.quality!=='low')this.emitParticles(conquered);
  }
  emitParticles(ids){
    const origins=[],velocity=[];
    for(const id of ids){const p=this.meshes.get(id).position;for(let i=0;i<7;i++){origins.push(p[0]+(Math.random()-.5)*12,p[1]+(Math.random()-.5)*12,6);velocity.push((Math.random()-.5)*35,Math.random()*40+15,0);}}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(origins,3));
    const object=new THREE.Points(geometry,new THREE.PointsMaterial({color:0x9affc0,size:3,transparent:true,opacity:0.9,depthTest:false}));this.root.add(object);this.particles.push({object,origins,velocity,start:performance.now()});
  }
  focus(ids){
    const points=ids.map(id=>this.meshes.get(id)?.position).filter(Boolean);if(!points.length)return;
    if(points.length===2&&Math.abs(points[0][0]-points[1][0])>1000){this.reset();return;}
    this.target.x=points.reduce((s,p)=>s+p[0],0)/points.length;
    this.target.y=points.reduce((s,p)=>s+p[1],0)/points.length;
    this.target.zoom=Math.min(3.2,Math.max(1.3,600/Math.max(140,...points.map(p=>Math.abs(p[0]-this.target.x)*2))));
  }
  reset(){this.target={x:0,y:15,zoom:0.92};}
  zoom(factor){this.target.zoom=THREE.MathUtils.clamp(this.target.zoom*factor,0.65,9);}
  tilt(){this.tilted=!this.tilted;}
  battle(a,b){for(const id of [a,b]){const m=this.meshes.get(id);if(m){m.line.material.color.setHex(id===a?0x75f2b0:0xffb868);m.line.material.opacity=1;m.mesh.material.color.setHex(0xffffff);}}}
  animate(now){
    this.frame=requestAnimationFrame(this.animate);
    const dt=Math.min((now-this.last)/1000,0.1);this.last=now;const f=1-Math.exp(-dt*5);
    this.camera.position.x+=(this.target.x-this.camera.position.x)*f;this.camera.position.y+=(this.target.y-this.camera.position.y)*f;
    this.camera.zoom+=(this.target.zoom-this.camera.zoom)*f;this.camera.updateProjectionMatrix();
    this.root.rotation.x+=((this.tilted?-0.24:0)-this.root.rotation.x)*f;
    this.markers.forEach(m=>m.scale.setScalar(1/Math.max(1,this.camera.zoom*0.65)));
    this.effects=this.effects.filter(effect=>{
      const m=this.meshes.get(effect.id),t=(now-effect.start)/1000;
      m.uniforms.conquestProgress.value=Math.min(1,t/0.8);
      if(t>1){m.mesh.position.z=1.8;m.mesh.material.color.setHex(0xc4d3df);m.line.material.color.setHex(0x102b43);m.line.material.opacity=0;return false;}
      m.mesh.position.z=1.8+Math.sin(t*Math.PI)*8;m.mesh.material.color.setRGB(1,1,0.8+Math.sin(t*10)*0.2);m.line.material.color.setHex(0x8bffc3);m.line.material.opacity=1;return true;
    });
    this.particles=this.particles.filter(p=>{
      const t=(now-p.start)/1000;if(t>1){this.root.remove(p.object);p.object.geometry.dispose();p.object.material.dispose();return false;}
      const attr=p.object.geometry.attributes.position;for(let i=0;i<attr.count;i++)attr.setXYZ(i,p.origins[i*3]+p.velocity[i*3]*t,p.origins[i*3+1]+p.velocity[i*3+1]*t-25*t*t,6);
      attr.needsUpdate=true;p.object.material.opacity=(1-t)*0.9;return true;
    });
    this.renderer.render(this.scene,this.camera);
  }
  dispose(){cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.scene.traverse(o=>{o.geometry?.dispose();if(o.material)o.material.dispose();});this.textures.forEach(t=>t.dispose());this.renderer.dispose();}
}
