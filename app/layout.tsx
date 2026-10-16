import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Schmaqq — Gemeinsam weiter",description:"Euer gemeinsamer Arbeitsplatz für digitale Services.",icons:{icon:"/favicon.svg"}};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="de"><body>{children}</body></html>}
