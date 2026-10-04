export type BlackHoleEventId = 'tidal-disruption'|'gas-capture'|'debris-infall';
/** Viewing windows are annotations, not prescribed ray arrivals. Sources use the retarded PG clock. */
import { BLACK_HOLE_EVENTS } from '../content/events';
export { BLACK_HOLE_EVENTS } from '../content/events';
export const blackHoleEventAt=(t:number)=>BLACK_HOLE_EVENTS.find(e=>t>=e.start&&t<e.end);
