export function powerModeFromChecks(population,military){
  return population&&military?'combined':population?'population':military?'military':null;
}
export function checksFromPowerMode(mode){
  return {population:mode==='population'||mode==='combined',military:mode==='military'||mode==='combined'};
}
