const STARS = [
  { top: '6%', left: '8%', size: 2, delay: '0s', duration: '3.4s', twinkle: true },
  { top: '9%', left: '22%', size: 1.5, delay: '0.4s', duration: '4.1s', twinkle: true },
  { top: '4%', left: '37%', size: 2.2, delay: '1.1s', duration: '2.8s', twinkle: true },
  { top: '12%', left: '51%', size: 1.4, delay: '0.2s', duration: '3.8s', twinkle: false },
  { top: '7%', left: '68%', size: 2, delay: '1.6s', duration: '3.1s', twinkle: true },
  { top: '15%', left: '81%', size: 1.6, delay: '0.8s', duration: '4.4s', twinkle: true },
  { top: '3%', left: '91%', size: 1.8, delay: '2s', duration: '3.6s', twinkle: true },
  { top: '18%', left: '14%', size: 1.3, delay: '1.3s', duration: '5s', twinkle: false },
  { top: '21%', left: '29%', size: 2.4, delay: '0.6s', duration: '2.6s', twinkle: true },
  { top: '16%', left: '44%', size: 1.5, delay: '2.2s', duration: '3.9s', twinkle: true },
  { top: '24%', left: '59%', size: 1.2, delay: '0.1s', duration: '4.7s', twinkle: false },
  { top: '11%', left: '74%', size: 1.9, delay: '1.8s', duration: '3.3s', twinkle: true },
  { top: '20%', left: '88%', size: 1.4, delay: '0.9s', duration: '4s', twinkle: true },
  { top: '28%', left: '6%', size: 1.1, delay: '2.4s', duration: '5.2s', twinkle: false },
  { top: '8%', left: '96%', size: 2.1, delay: '1.4s', duration: '2.9s', twinkle: true },
  { top: '26%', left: '39%', size: 1.3, delay: '0.5s', duration: '4.2s', twinkle: true },
  { top: '5%', left: '58%', size: 1.7, delay: '1.9s', duration: '3.5s', twinkle: true },
  { top: '14%', left: '3%', size: 1.2, delay: '2.6s', duration: '4.8s', twinkle: false },
  { top: '19%', left: '97%', size: 1.5, delay: '0.3s', duration: '3.2s', twinkle: true },
  { top: '10%', left: '46%', size: 1.1, delay: '1.5s', duration: '5.4s', twinkle: false },
  { top: '23%', left: '71%', size: 1.8, delay: '2.1s', duration: '3s', twinkle: true },
  { top: '13%', left: '17%', size: 1.4, delay: '0.7s', duration: '4.6s', twinkle: true },
] as const

export function Stars() {
  return (
    <div className="login-stars" aria-hidden="true">
      {STARS.map((star, index) => (
        <span
          key={index}
          className={star.twinkle ? 'login-star login-star--twinkle' : 'login-star'}
          style={{
            top: star.top,
            left: star.left,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }}
        />
      ))}
      <span className="login-stars__shoot" />
    </div>
  )
}
