// Reusable flag SVG components

export const FlagUS = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" className="w-5 h-3.5 rounded-sm">
    <clipPath id="s"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
    <clipPath id="t"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
    <g clipPath="url(#s)">
      <path d="M0,0 v30 h60 v-30 z" fill="#bd3d44"/>
      <path d="M0,3.46 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.61 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 zm0,4.62 v2.31 h60 v-2.31 z" fill="#fff"/>
      <path d="M0,0 v16.15 h24 v-16.15 z" fill="#192f5d"/>
    </g>
  </svg>
);

export const FlagKR = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-5 h-3.5 rounded-sm">
    <rect width="60" height="40" fill="#fff"/>
    <circle cx="30" cy="20" r="10" fill="#cd2e3a"/>
    <path d="M30,10 a10,10 0 0,0 0,20 a5,5 0 0,0 0,-10 a5,5 0 0,1 0,-10" fill="#0047a0"/>
  </svg>
);

export const FlagVN = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 40" className="w-5 h-3.5 rounded-sm">
    <rect width="60" height="40" fill="#da251d"/>
    <polygon points="30,8 33.5,18.5 44,18.5 35.5,24.5 39,35 30,28 21,35 24.5,24.5 16,18.5 26.5,18.5" fill="#ffff00"/>
  </svg>
);

export const FlagComponents: { [key: string]: () => JSX.Element } = {
  en: FlagUS,
  ko: FlagKR,
  vi: FlagVN,
};
