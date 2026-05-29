export default function NeuralBackground() {
  return (
    <div className="neural-bg" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <g className="neural-orbits">
          <path d="M-120 470 C 160 260, 510 240, 860 310 C 1160 370, 1500 340, 1620 210" />
          <path d="M-80 730 C 290 580, 690 510, 1100 620 C 1320 680, 1520 720, 1630 610" />
          <path d="M150 120 C 420 200, 700 360, 980 320 C 1230 280, 1430 190, 1620 120" />
          <path d="M10 840 C 320 760, 620 720, 880 760 C 1170 810, 1390 860, 1620 800" />
          <path d="M260 70 C 490 280, 560 560, 470 850" />
          <path d="M1130 50 C 1240 250, 1240 520, 1080 850" />
          <path d="M-120 210 C 140 180, 390 260, 580 470 C 770 680, 1060 760, 1540 760" />
        </g>

        <g className="neural-nodes">
          <circle cx="120" cy="420" r="4" />
          <circle cx="420" cy="260" r="4" />
          <circle cx="630" cy="540" r="5" />
          <circle cx="900" cy="250" r="5" />
          <circle cx="1120" cy="510" r="4" />
          <circle cx="1310" cy="350" r="4" />
          <circle cx="1360" cy="690" r="5" />
          <circle cx="1050" cy="760" r="4" />
          <circle cx="720" cy="760" r="4" />
          <circle cx="450" cy="690" r="4" />
          <circle cx="230" cy="610" r="4" />
          <circle cx="70" cy="770" r="3.5" />
          <circle cx="980" cy="110" r="4" />
        </g>
      </svg>
    </div>
  );
}
