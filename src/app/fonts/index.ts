import localFont from "next/font/local";

export const baselGrotesk = localFont({
  src: [
    {
      path: "./basel/Basel_Grotesk_Book-s.p.1xpmqpfyi1rq7.woff2",
      style: "normal",
      weight: "300",
    },
    {
      path: "./basel/Basel_Grotesk_Regular-s.p.0avcpe63pbqg1.woff2",
      style: "normal",
      weight: "400",
    },
    {
      path: "./basel/Basel_Grotesk_Medium-s.p.2g13jkc04g8lq.woff2",
      style: "normal",
      weight: "500",
    },
    {
      path: "./basel/Basel_Grotesk_Bold-s.p.3lkjhb81_-kp5.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-basel-sans",
});

export const baselMono = localFont({
  src: [
    {
      path: "./basel/Basel_Grotesk_Mono_Regular-s.p.2l3bkeocgnp2q.woff2",
      style: "normal",
      weight: "400",
    },
  ],
  variable: "--font-basel-mono",
});

export const zuume = localFont({
  src: [
    {
      path: "./zuume/Zuume-Bold.woff2",
      style: "normal",
      weight: "700",
    },
  ],
  variable: "--font-zuume",
});

export const martina = localFont({
  src: [
    {
      path: "./martina/martina_plantijn_light-s.p.2benah1gd_n6r.woff2",
      style: "normal",
      weight: "300",
    },
    {
      path: "./martina/martina_plantijn_light_italic-s.p.33b1jrkr3r6wi.woff2",
      style: "italic",
      weight: "300",
    },
  ],
  variable: "--font-martina-serif",
});
