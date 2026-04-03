const sourceModules = import.meta.glob("../assets/source/*.png", { eager: true });

const SOURCE_PNG_URLS = Object.keys(sourceModules)
  .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  .map((path) => sourceModules[path].default);

export default function HeroSourceImageFlow() {
  if (SOURCE_PNG_URLS.length === 0) return null;

  return (
    <div className="home-hero-imgflow" aria-hidden>
      <div className="home-hero-imgflow__fade home-hero-imgflow__fade--left" />
      <div className="home-hero-imgflow__fade home-hero-imgflow__fade--right" />
      <div className="home-hero-imgflow__track">
        {SOURCE_PNG_URLS.map((src) => (
          <div className="home-hero-imgflow__cell" key={src}>
            <img src={src} alt="" className="home-hero-imgflow__img" loading="lazy" decoding="async" />
          </div>
        ))}
        {SOURCE_PNG_URLS.map((src) => (
          <div className="home-hero-imgflow__cell" key={`${src}-dup`}>
            <img src={src} alt="" className="home-hero-imgflow__img" loading="lazy" decoding="async" />
          </div>
        ))}
      </div>
    </div>
  );
}
