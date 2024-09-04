import { Roboto as FontText, Archivo as FontTitle } from "next/font/google";

export const fontText = FontText({
  subsets: ["latin"],
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-text",
});

export const fontTitle = FontTitle({
  subsets: ["latin"],
  variable: "--font-title",
});
