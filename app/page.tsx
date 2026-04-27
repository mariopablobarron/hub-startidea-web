import { Hero } from "@/components/Hero";
import { RoomsGrid } from "@/components/RoomsGrid";
import { Floorplan } from "@/components/Floorplan";
import { Services } from "@/components/Services";
import { Podcast } from "@/components/Podcast";
import { Community } from "@/components/Community";
import { Contact } from "@/components/Contact";

export default function HomePage() {
  return (
    <>
      <Hero />
      <RoomsGrid />
      <Floorplan />
      <Services />
      <Podcast />
      <Community />
      <Contact />
    </>
  );
}
