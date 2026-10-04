export const ANNOTATIONS=[
 {anchor:'earth',start:9,end:16,type:'orientation',title:'ARCHIVE TIME',zh:'时间记录',en:'These are mission epochs, compressed for viewing.',body:'这是任务档案时间；漫长航程经过剪辑压缩。'},
 {anchor:'earth',start:19,end:27,type:'distance',title:'DISTANCE / LIGHT TIME',zh:'距离与信号',en:'Distance also measures how long a reply must travel.',body:'离家距离，也决定一封回信需要多久。'},
 {anchor:'sun',start:43,end:51,type:'solar',title:'ONE ASTRONOMICAL UNIT',zh:'一个天文单位',en:'Sunlight takes about 8 min 20 s to reach Earth.',body:'太阳到地球，光也要走约 8 分 20 秒。'},
 {anchor:'course',start:63,end:69,type:'galaxy',title:'COURSE ALIGNED',zh:'航向校准',en:'The Sun becomes one point among the stars.',body:'太阳逐渐融入星场；镜头尺度与航程均经过压缩。'},
 {anchor:'pulsar',start:111,end:119,type:'pulse',title:'A ROTATING BEACON',zh:'旋转的灯塔',en:'A beam sweeps our line of sight. The star is not blinking.',body:'光束周期性扫过视线；并非恒星反复开关。'},
 {anchor:'disk',start:177,end:185,type:'lensing',title:'ONE SOURCE / MULTIPLE PATHS',zh:'一个光源，多条来路',en:'Curved light paths form separate images of the same disk.',body:'盘面背后的光沿弯曲路径抵达，形成不同像。'},
 {anchor:'disk',start:201,end:209,type:'spectrum',title:'FREQUENCY IS A MEASUREMENT',zh:'光，也携带运动',en:'Orbital motion and gravity change the received frequency.',body:'轨道运动与引力共同改变接收频率；示意色并非测得光谱。'},
 {anchor:'relay',start:220,end:228,type:'clocks',title:'TWO CLOCKS / ONE WORLDLINE',zh:'两只钟，同一段旅程',en:'The distant reading arrives inside an older echo.',body:'远端读数随较早的回声抵达，并非远方的“此刻”。'},
 {anchor:'disk',start:239,end:247,type:'lensing',title:'DELAYED LIGHT / DIFFERENT ARRIVALS',zh:'延迟来光',en:'Different paths carry different moments of the same source.',body:'不同路径携带光源不同时刻的影像；不是预见未来。'},
 {anchor:'cone',start:256,end:264,type:'cone',title:'FUTURE LIGHT CONE',zh:'未来光锥',en:'Inside the horizon, every future radial light path leads inward.',body:'视界内，两支未来径向光路都指向更小的半径。'},
 {anchor:'horizon',start:275,end:283,type:'horizon',title:'NO MATERIAL SURFACE',zh:'没有实体表面',en:'The horizon marks a causal boundary, not a wall.',body:'视界界定返回外界的可能性；这里没有一堵墙。'},
];

export type Annotation = typeof ANNOTATIONS[number];
