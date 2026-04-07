import { useEffect, useState, useRef, Suspense, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import earthTexture from "@/assets/earth-texture.jpg";

// Approximate lat/lng for supported countries
const COUNTRY_COORDS: Record<string, [number, number]> = {
  AE: [24.5, 54.5],    // UAE
  GB: [51.5, -0.1],    // UK
  US: [39.0, -98.0],   // USA
  CA: [56.0, -106.0],  // Canada
  TR: [39.9, 32.9],    // Turkey
  MY: [3.1, 101.7],    // Malaysia
  SA: [24.7, 46.7],    // Saudi Arabia
  DE: [51.2, 10.4],    // Germany
  AU: [-25.3, 133.8],  // Australia
  TH: [13.8, 100.5],   // Thailand
  FR: [46.6, 2.2],     // France
  IT: [41.9, 12.5],    // Italy
  ES: [40.5, -3.7],    // Spain
  JP: [36.2, 138.3],   // Japan
  CN: [35.9, 104.2],   // China
  SG: [1.3, 103.8],    // Singapore
  QA: [25.3, 51.2],    // Qatar
  OM: [21.5, 55.9],    // Oman
  NL: [52.1, 5.3],     // Netherlands
  CH: [46.8, 8.2],     // Switzerland
};

function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface CountryData {
  id: string;
  name: string;
  flag_emoji: string;
  code: string;
}

function CountryMarker({
  country,
  radius,
  onClick,
}: {
  country: CountryData;
  radius: number;
  onClick: () => void;
}) {
  const coords = COUNTRY_COORDS[country.code];
  const position = useMemo(
    () => coords ? latLngToVector3(coords[0], coords[1], radius) : null,
    [coords, radius]
  );

  if (!position) return null;

  return (
    <group position={position}>
      {/* Glowing dot */}
      <mesh>
        <sphereGeometry args={[0.025, 16, 16]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      {/* Pulse ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.03, 0.045, 32]} />
        <meshBasicMaterial color="#f59e0b" transparent opacity={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* HTML label */}
      <Html
        distanceFactor={4}
        style={{ pointerEvents: "auto", whiteSpace: "nowrap" }}
        center
        position={[0, 0.08, 0]}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className="flex items-center gap-1.5 rounded-full bg-card/90 border border-border/60 px-3 py-1.5 text-xs font-semibold text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-110 hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer select-none"
        >
          <span className="text-base leading-none">{country.flag_emoji}</span>
          <span>{country.name}</span>
        </button>
      </Html>
    </group>
  );
}

function Globe({ countries, onSelect }: { countries: CountryData[]; onSelect: (id: string) => void }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, earthTexture);

  // Slow auto-rotate
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  return (
    <group>
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[1.62, 64, 64]} />
        <meshBasicMaterial color="#3b82f6" transparent opacity={0.07} side={THREE.BackSide} />
      </mesh>

      {/* Earth */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[1.55, 64, 64]} />
        <meshStandardMaterial map={texture} metalness={0.1} roughness={0.8} />

        {/* Country markers as children so they rotate with globe */}
        {countries.map((c) => (
          <CountryMarker
            key={c.id}
            country={c}
            radius={1.58}
            onClick={() => onSelect(c.id)}
          />
        ))}
      </mesh>
    </group>
  );
}

const GlobeSection = () => {
  const [countries, setCountries] = useState<CountryData[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("countries")
      .select("id, name, flag_emoji, code")
      .order("name")
      .then(({ data }) => {
        if (data) setCountries(data);
      });
  }, []);

  const handleSelect = (countryId: string) => {
    navigate(`/eligibility?country=${countryId}`);
  };

  return (
    <section className="relative bg-gradient-to-b from-background via-card to-background py-16 md:py-24 overflow-hidden">
      <div className="container px-4 text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3">
          Pick Your Destination 🌍
        </h2>
        <p className="text-muted-foreground text-lg max-w-xl mx-auto">
          Spin the globe & tap a country to check your visa eligibility
        </p>
      </div>

      <div className="container px-4">
        <div className="mx-auto w-full max-w-2xl aspect-square md:aspect-[4/3]">
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Loading globe...
              </div>
            }
          >
            <Canvas
              camera={{ position: [0, 0, 4], fov: 45 }}
              style={{ width: "100%", height: "100%" }}
            >
              <ambientLight intensity={0.6} />
              <directionalLight position={[5, 3, 5]} intensity={1} />
              <Globe countries={countries} onSelect={handleSelect} />
              <OrbitControls
                enableZoom={true}
                enablePan={false}
                minDistance={2.5}
                maxDistance={6}
                autoRotate={false}
                rotateSpeed={0.5}
              />
            </Canvas>
          </Suspense>
        </div>
      </div>
    </section>
  );
};

export default GlobeSection;
