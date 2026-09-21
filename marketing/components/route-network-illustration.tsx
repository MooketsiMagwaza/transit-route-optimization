/** Accessible, zero-JavaScript route preview; labels are HTML so they stay legible at every width. */

const ROUTE = "M110 195C205 165 292 205 330 252C358 288 318 326 348 358C386 398 470 352 525 388C575 420 590 440 648 452";

export function RouteNetworkIllustration() {
  return (
    <figure className="route-figure" aria-labelledby="route-caption">
      <div className="route-canvas">
        <svg viewBox="0 0 760 620" role="img" aria-labelledby="route-map-title route-map-desc" preserveAspectRatio="xMidYMid slice">
          <title id="route-map-title">A Tsela journey from Broadhurst to Main Mall</title>
          <desc id="route-map-desc">A simplified street network with one highlighted road-following combi route.</desc>
          <defs>
            <pattern id="street-grid" width="44" height="44" patternUnits="userSpaceOnUse">
              <path d="M44 0H0V44" fill="none" stroke="#dcdfd6" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="760" height="620" fill="#f7f8f3" />
          <rect width="760" height="620" fill="url(#street-grid)" />
          <g fill="none" stroke="#c4c9bd" strokeLinecap="round">
            <path d="M35 160C170 120 285 182 405 132S640 82 742 146" strokeWidth="14" />
            <path d="M76 500C172 421 260 450 352 370S568 246 732 272" strokeWidth="18" />
            <path d="M160 24C142 150 214 245 183 364S144 522 180 600" strokeWidth="12" />
            <path d="M531 20C499 154 544 244 512 350S508 506 592 608" strokeWidth="13" />
            <path d="M325 10C313 117 356 198 329 296S278 482 318 612" strokeWidth="8" />
          </g>
          <g fill="#dfead2" stroke="#c0cfaf" strokeWidth="2">
            <path d="M42 284Q99 225 154 276T263 277Q236 340 172 354T42 284Z" />
            <path d="M553 394Q637 337 721 404L706 544Q614 567 549 507Z" />
          </g>
          <path className="route-casing" d={ROUTE} />
          <path className="route-line" d={ROUTE} />
          <g className="route-stop" transform="translate(110 195)"><circle r="16" /><circle r="6" /></g>
          <g className="route-stop destination" transform="translate(648 452)"><circle r="16" /><circle r="6" /></g>
          <g className="route-arrow" transform="translate(430 374) rotate(-4)"><circle r="21" /><path d="M-7 7 9 0-7-7Z" /></g>
        </svg>
        <p className="route-chip origin"><small>Your location</small><strong>Broadhurst</strong></p>
        <p className="route-chip destination"><small>Right stop</small><strong>Main Mall</strong></p>
      </div>
      <dl className="route-stats">
        <div><dt>Time</dt><dd>26 min</dd></div>
        <div><dt>Ride</dt><dd>1 combi</dd></div>
        <div><dt>Fare</dt><dd>P8 est.</dd></div>
      </dl>
      <figcaption id="route-caption">Illustrative example. The live, searchable map opens when you plan a trip.</figcaption>
    </figure>
  );
}
