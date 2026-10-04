export const flightText={
 music:{zh:'音乐链路',en:'MUSIC LINK'}, drive:{zh:'航行等级',en:'NAVIGATION DRIVE'},
 standard:{zh:'导演标准',en:'DIRECTOR STANDARD'}, changed:{zh:'推进指令确认',en:'DRIVE CHANGE CONFIRMED'},
 state:{missing:{zh:'待接入',en:'AWAITING SIGNAL'},muted:{zh:'静默',en:'MUTED'},online:{zh:'已连接',en:'ONLINE'},paused:{zh:'链路待机',en:'STANDBY'},blocked:{zh:'点击连接',en:'TAP TO CONNECT'},ended:{zh:'乐曲结束',en:'END OF SIGNAL'},error:{zh:'音源不可用',en:'SIGNAL UNAVAILABLE'}},
};
export const DRIVE_LEVELS=[
 {id:'standby',zh:'待机',en:'STANDBY',rate:0},
 {id:'ahead1',zh:'前进 I',en:'AHEAD I',rate:.55},
 {id:'ahead2',zh:'前进 II',en:'AHEAD II',rate:1},
 {id:'ahead3',zh:'前进 III',en:'AHEAD III',rate:1.75},
 {id:'transit',zh:'深空巡航',en:'DEEP TRANSIT',rate:4},
] as const;
export const DEFAULT_DRIVE=2;
