import { Hero } from "@/components/Hero";
import { Manifesto } from "@/components/Manifesto";
import { EcosystemStartidea } from "@/components/EcosystemStartidea";
import { RoomsGrid } from "@/components/RoomsGrid";
import { Floorplan } from "@/components/Floorplan";
import { MethodRaizAccion } from "@/components/MethodRaizAccion";
import { Services } from "@/components/Services";
import { Podcast } from "@/components/Podcast";
import { Community } from "@/components/Community";
import { Contact } from "@/components/Contact";
import { JsonLd } from "@/components/JsonLd";
import {
  localBusinessSchema,
  coworkingSpaceSchema,
  websiteSchema,
} from "@/lib/seo/structuredData";

export default function HomePage() {
  return (
    <>
      <JsonLd
        data={[localBusinessSchema(), coworkingSpaceSchema(), websiteSchema()]}
      />
      <Hero />
      <Manifesto />
      <EcosystemStartidea />
      <RoomsGrid />
      <Floorplan />
      <MethodRaizAccion />
      <Services />
      <Podcast />
      <Community />
      <Contact />
    </>
  );
}
