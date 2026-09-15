export function Mountains() {
  return (
    <div className="login-mountains" aria-hidden="true">
      <div className="login-mountains__layer login-mountains__layer--far">
        <svg className="login-mountains__svg" viewBox="0 0 1400 420" preserveAspectRatio="none">
          <path
            className="login-mountains__fill login-mountains__fill--far"
            d="M0 420V248c72-18 118-92 198-86 86 6 112-78 206-70 88 8 118-62 208-48 96 15 128 18 214-28 90-48 128 22 226 8 78-11 118 42 188 58l160 28v312z"
          />
          <path
            className="login-mountains__snow"
            fill="#d7e4f5"
            opacity=".28"
            d="M318 178c-18 22-41 38-70 46l28-64c22 2 38 8 42 18zm206-16c-24 20-58 38-96 44l38-78c28 6 48 18 58 34zm214-42c-30 28-70 48-118 52l52-92c34 8 56 22 66 40zm248 22c-26 18-62 32-102 36l40-70c30 6 50 18 62 34z"
          />
        </svg>
      </div>

      <div className="login-mountains__layer login-mountains__layer--mid">
        <svg className="login-mountains__svg" viewBox="0 0 1400 420" preserveAspectRatio="none">
          <path
            className="login-mountains__fill login-mountains__fill--mid"
            d="M0 420V292c90-8 140-96 236-88 84 7 110-54 198-46 92 8 120-78 220-62 108 17 140-12 230-58 86-44 130 36 214 28 70-6 112 48 182 64l120 22v268z"
          />
          <path
            fill="#9eb4d4"
            opacity=".16"
            d="M236 220c-22 18-54 32-90 38l34-62c26 4 46 14 56 24zm198 8c-28 22-64 36-108 40l42-74c30 8 52 20 66 34zm242-48c-32 26-78 44-128 48l56-88c36 10 58 24 72 40z"
          />
        </svg>
      </div>

      <div className="login-mountains__layer login-mountains__layer--near">
        <svg className="login-mountains__svg" viewBox="0 0 1400 420" preserveAspectRatio="none">
          <path
            className="login-mountains__fill login-mountains__fill--near"
            d="M0 420V338c110 6 168-70 268-58 86 10 124-36 208-22 94 16 128-52 226-34 102 19 148-18 240-8 78 8 124 38 198 28l260-18v174z"
          />
        </svg>
      </div>
    </div>
  )
}
