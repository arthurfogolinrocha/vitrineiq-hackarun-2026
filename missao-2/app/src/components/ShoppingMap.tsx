import React, { useState } from 'react';
import { Box, Camera, Compass, Flame, MapPin, Store, TrendingUp } from 'lucide-react';
import {
  CrossSegmentRoute,
  FloorId,
  ShoppingZone,
  ZoneId,
} from '../types';
import { ZoneLiveTelemetry } from '../services/opportunityEngine';
import { LOST_SALE_LABELS } from '../data/shoppingData';
import { SpotlightCard } from './SpotlightCard';

interface ShoppingMapProps {
  floor: FloorId;
  onFloorChange: (floor: FloorId) => void;
  zonesTelemetry: ZoneLiveTelemetry[];
  selectedZoneId: ZoneId;
  onSelectZone: (zoneId: ZoneId) => void;
  routes: CrossSegmentRoute[];
}

function getHeatColors(score: number, isSelected: boolean) {
  if (score >= 70) {
    return {
      fill: isSelected ? 'rgba(245, 158, 11, 0.34)' : 'rgba(245, 158, 11, 0.16)',
      stroke: isSelected ? '#fbbf24' : '#d97706',
      badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      label: 'Alta Demanda',
    };
  }
  if (score >= 45) {
    return {
      fill: isSelected ? 'rgba(16, 185, 129, 0.30)' : 'rgba(16, 185, 129, 0.14)',
      stroke: isSelected ? '#34d399' : '#059669',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      label: 'Oportunidade Ativa',
    };
  }
  return {
    fill: isSelected ? 'rgba(56, 189, 248, 0.30)' : 'rgba(56, 189, 248, 0.12)',
    stroke: isSelected ? '#38bdf8' : '#0284c7',
    badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    label: 'Fluxo Estável',
  };
}

export const ShoppingMap: React.FC<ShoppingMapProps> = ({
  floor,
  onFloorChange,
  zonesTelemetry,
  selectedZoneId,
  onSelectZone,
  routes,
}) => {
  const [is3D, setIs3D] = useState(true);
  const selectedTelemetry =
    zonesTelemetry.find((t) => t.zone.id === selectedZoneId) || zonesTelemetry[0];

  const zoneById = (id: ZoneId) =>
    zonesTelemetry.find((t) => t.zone.id === id) || zonesTelemetry[0];

  const handleZonePick = (zone: ShoppingZone) => {
    if (zone.floor !== floor) {
      onFloorChange(zone.floor);
    }
    onSelectZone(zone.id);
  };

  const zSul = zoneById('ala-sul-esporte');
  const zCentral = zoneById('ala-central-ancoras');
  const zGourmet = zoneById('alameda-gourmet');
  const zLazer = zoneById('ala-lazer-cinema');
  const zL2 = zoneById('praca-alimentacao-l2');

  const cSul = getHeatColors(zSul.opportunityScore, selectedZoneId === zSul.zone.id);
  const cCentral = getHeatColors(zCentral.opportunityScore, selectedZoneId === zCentral.zone.id);
  const cGourmet = getHeatColors(zGourmet.opportunityScore, selectedZoneId === zGourmet.zone.id);
  const cLazer = getHeatColors(zLazer.opportunityScore, selectedZoneId === zLazer.zone.id);
  const cL2 = getHeatColors(zL2.opportunityScore, selectedZoneId === zL2.zone.id);

  return (
    <div className="space-y-6 panel-enter">
      {/* Cabeçalho do Mapa + Troca de Pavimento + Toggle 2D/3D */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-400" aria-hidden="true" />
              Mapa 3D Oficial (Planta Mix) — Capim Dourado Shopping
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Baseado fielmente na Planta Mix 2026 (38.800,50 m²) — 1º Pavimento Térreo e 2º Pavimento Praça de Alimentação.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIs3D((prev) => !prev)}
              aria-pressed={is3D}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                is3D
                  ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 shadow'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Box className="w-3.5 h-3.5" aria-hidden="true" />
              {is3D ? 'Vista 3D Isométrica' : 'Vista 2D Plana'}
            </button>

            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800" role="group" aria-label="Selecionar pavimento do shopping">
              <button
                type="button"
                onClick={() => {
                  onFloorChange('L1');
                  if (selectedTelemetry.zone.floor !== 'L1') {
                    onSelectZone('ala-central-ancoras');
                  }
                }}
                aria-pressed={floor === 'L1'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  floor === 'L1'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                1º Pavimento — Térreo
              </button>
              <button
                type="button"
                onClick={() => {
                  onFloorChange('L2');
                  onSelectZone('praca-alimentacao-l2');
                }}
                aria-pressed={floor === 'L2'}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  floor === 'L2'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                2º Pavimento — Alimentação
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Planta Arquitetônica Oficial 2D/3D */}
          <div className="xl:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
              <span>Planta Mix Real: Av. JK (Oeste) • Av. NS-05 (Sul) • Av. LO 2A (Leste)</span>
              <span className="font-mono text-emerald-400">Telemetria + Sensor Vitrine (LGPD)</span>
            </div>

            <div className="map-stage-3d py-2">
              <div className={`map-plane ${is3D ? 'is-3d' : ''}`}>
                <svg
                  viewBox="0 0 1080 560"
                  role="img"
                  aria-label={`Planta arquitetônica oficial do ${floor === 'L1' ? '1º Pavimento Térreo' : '2º Pavimento Praça de Alimentação'} do Capim Dourado Shopping`}
                  className="w-full h-auto rounded-xl bg-[#040915] border border-slate-800/90 shadow-2xl"
                >
                  <defs>
                    <filter id="extrude3d" x="-10%" y="-10%" width="125%" height="130%">
                      <feDropShadow dx="5" dy="8" stdDeviation="4" floodColor="#020617" floodOpacity="0.95" />
                    </filter>
                    <pattern id="parkingGrid" width="14" height="14" patternUnits="userSpaceOnUse">
                      <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(148, 163, 184, 0.08)" strokeWidth="1" />
                    </pattern>
                  </defs>

                  <title>Planta Oficial Capim Dourado Shopping — VitrineIQ</title>

                  {floor === 'L1' ? (
                    /* ================= 1º PAVIMENTO — TÉRREO (FIEL AO PDF 1/2) ================= */
                    <g>
                      {/* Malha Viária & Rotatórias Oficiais */}
                      {/* Avenida JK (Vertical Esquerda) */}
                      <rect x="38" y="30" width="26" height="430" fill="#0f172a" stroke="#1e293b" />
                      <circle cx="51" cy="488" r="34" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                      <circle cx="51" cy="488" r="14" fill="#040915" stroke="#475569" strokeWidth="1.5" />
                      <text x="24" y="255" fill="#94a3b8" fontSize="11" fontWeight="700" transform="rotate(-90 24 255)">
                        AVENIDA JK
                      </text>

                      {/* Avenida NS-05 (Horizontal Embaixo) */}
                      <rect x="85" y="476" width="845" height="24" fill="#0f172a" stroke="#1e293b" />
                      <text x="480" y="520" fill="#94a3b8" fontSize="11" fontWeight="700">
                        AVENIDA NS-05
                      </text>

                      {/* Avenida LO 2A (Vertical Direita) */}
                      <circle cx="964" cy="488" r="34" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                      <circle cx="964" cy="488" r="14" fill="#040915" stroke="#475569" strokeWidth="1.5" />
                      <rect x="952" y="30" width="24" height="424" fill="#0f172a" stroke="#1e293b" />
                      <text x="995" y="290" fill="#94a3b8" fontSize="11" fontWeight="700" transform="rotate(-90 995 290)">
                        AVENIDA LO 2A
                      </text>

                      {/* Estacionamentos Norte (em diagonal) e Sul */}
                      <path
                        d="M 105 188 L 690 48 L 895 48 L 895 140 L 105 235 Z"
                        fill="url(#parkingGrid)"
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text x="275" y="136" fill="#475569" fontSize="10" fontWeight="600" transform="rotate(-13 275 136)">
                        ESTACIONAMENTO NORTE
                      </text>

                      <rect
                        x="185"
                        y="418"
                        width="725"
                        height="46"
                        rx="6"
                        fill="url(#parkingGrid)"
                        stroke="#1e293b"
                        strokeDasharray="4 4"
                      />
                      <text x="455" y="446" fill="#475569" fontSize="10" fontWeight="600">
                        ESTACIONAMENTO SUL
                      </text>

                      {/* Silhueta Extrudada em 3D do Prédio Principal */}
                      <path
                        d="M 96 292 C 88 380, 128 416, 210 412 L 485 412 L 545 432 L 735 412 L 908 412 L 908 18 L 725 56 L 685 162 L 572 130 L 420 150 L 325 220 L 96 248 Z"
                        fill="#020617"
                        transform="translate(8, 10)"
                        opacity="0.85"
                      />
                      <path
                        d="M 96 292 C 88 380, 128 416, 210 412 L 485 412 L 545 432 L 735 412 L 908 412 L 908 18 L 725 56 L 685 162 L 572 130 L 420 150 L 325 220 L 96 248 Z"
                        fill="#0b1326"
                        stroke="#334155"
                        strokeWidth="2.5"
                      />

                      {/* ALA 1: ALA SUL — RENNER / CENTAURO (Oeste Sudoeste Arredondado) */}
                      <g
                        onClick={() => handleZonePick(zSul.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#extrude3d)"
                      >
                        <path
                          d="M 104 292 C 98 372, 134 404, 210 402 L 385 402 L 385 248 L 104 256 Z"
                          fill={cSul.fill}
                          stroke={cSul.stroke}
                          strokeWidth={selectedZoneId === zSul.zone.id ? 3.5 : 2}
                        />
                        {/* Blocos das Âncoras Reais */}
                        <rect x="118" y="280" width="92" height="92" rx="18" fill="rgba(239, 68, 68, 0.22)" stroke="#f87171" strokeWidth="1.4" />
                        <text x="164" y="330" textAnchor="middle" fill="#fecaca" fontSize="12" fontWeight="800">RENNER</text>

                        <rect x="235" y="346" width="128" height="44" rx="6" fill="rgba(220, 38, 38, 0.18)" stroke="#fb7185" strokeWidth="1.2" />
                        <text x="299" y="372" textAnchor="middle" fill="#ffe4e6" fontSize="11" fontWeight="700">CENTAURO</text>

                        <rect x="245" y="266" width="110" height="36" rx="6" fill="rgba(15, 23, 42, 0.7)" stroke="#475569" />
                        <text x="300" y="288" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="600">Stilo • Resolve</text>

                        <text x="122" y="272" fill="#fbbf24" fontSize="11" fontWeight="800">
                          Ala Sul • IQ {zSul.opportunityScore}
                        </text>
                      </g>

                      {/* ALA 2: ALA CENTRAL — C&A / RIACHUELO / LEITURA / ALAMEDA DAS CORES */}
                      <g
                        onClick={() => handleZonePick(zCentral.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#extrude3d)"
                      >
                        <path
                          d="M 392 156 L 568 136 L 682 170 L 682 325 L 392 325 Z"
                          fill={cCentral.fill}
                          stroke={cCentral.stroke}
                          strokeWidth={selectedZoneId === zCentral.zone.id ? 3.5 : 2}
                        />
                        {/* C&A (topo) */}
                        <rect x="448" y="152" width="102" height="58" rx="10" fill="rgba(56, 189, 248, 0.20)" stroke="#38bdf8" strokeWidth="1.3" />
                        <text x="499" y="185" textAnchor="middle" fill="#e0f2fe" fontSize="13" fontWeight="800">C&amp;A</text>

                        {/* Livraria Leitura (diagonal nordeste do miolo) */}
                        <rect x="572" y="182" width="96" height="44" rx="8" fill="rgba(167, 139, 250, 0.20)" stroke="#a78bfa" strokeWidth="1.2" transform="rotate(14 620 204)" />
                        <text x="618" y="208" textAnchor="middle" fill="#ede9fe" fontSize="10" fontWeight="700" transform="rotate(14 618 208)">leitura</text>

                        {/* RCHLO (coração central) */}
                        <rect x="435" y="232" width="142" height="68" rx="10" fill="rgba(248, 250, 252, 0.14)" stroke="#cbd5e1" strokeWidth="1.4" />
                        <text x="506" y="271" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="800">RCHLO</text>

                        <text x="404" y="315" fill="#34d399" fontSize="11" fontWeight="800">
                          Ala Central • IQ {zCentral.opportunityScore} ({zCentral.footTraffic}/h)
                        </text>
                      </g>

                      {/* ALA 3: ALAMEDA GOURMET — OUTBACK / MADERO / MARISA (Sul Leste) */}
                      <g
                        onClick={() => handleZonePick(zGourmet.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#extrude3d)"
                      >
                        <path
                          d="M 392 332 L 732 332 L 732 406 L 545 424 L 485 406 L 392 406 Z"
                          fill={cGourmet.fill}
                          stroke={cGourmet.stroke}
                          strokeWidth={selectedZoneId === zGourmet.zone.id ? 3.5 : 2}
                        />
                        <rect x="498" y="352" width="76" height="48" rx="8" fill="rgba(185, 28, 28, 0.30)" stroke="#f87171" strokeWidth="1.2" />
                        <text x="536" y="380" textAnchor="middle" fill="#fecaca" fontSize="10.5" fontWeight="800">OUTBACK</text>

                        <rect x="582" y="354" width="60" height="44" rx="6" fill="rgba(234, 179, 8, 0.22)" stroke="#facc15" strokeWidth="1.2" />
                        <text x="612" y="380" textAnchor="middle" fill="#fef08a" fontSize="10" fontWeight="700">MADERO</text>

                        <rect x="650" y="352" width="72" height="46" rx="6" fill="rgba(236, 72, 153, 0.22)" stroke="#f472b6" strokeWidth="1.2" />
                        <text x="686" y="379" textAnchor="middle" fill="#fbcfe8" fontSize="10.5" fontWeight="800">marisa</text>

                        <text x="404" y="352" fill="#fbbf24" fontSize="10.5" fontWeight="800">
                          Gourmet • IQ {zGourmet.opportunityScore}
                        </text>
                      </g>

                      {/* ALA 4: ALA LESTE / NORDESTE — CINEMARK / STZ / PERNAMBUCANAS / BIG / WOW / MOROFIT */}
                      <g
                        onClick={() => handleZonePick(zLazer.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#extrude3d)"
                      >
                        <path
                          d="M 692 170 L 732 58 L 902 24 L 902 404 L 740 404 L 740 326 L 692 326 Z"
                          fill={cLazer.fill}
                          stroke={cLazer.stroke}
                          strokeWidth={selectedZoneId === zLazer.zone.id ? 3.5 : 2}
                        />
                        {/* Faixa vertical Nordeste exatamente como o PDF */}
                        <rect x="748" y="48" width="132" height="28" rx="6" fill="rgba(16, 185, 129, 0.2)" stroke="#34d399" />
                        <text x="814" y="66" textAnchor="middle" fill="#d1fae5" fontSize="10" fontWeight="800">MOROFIT</text>

                        <rect x="748" y="82" width="132" height="26" rx="6" fill="rgba(168, 85, 247, 0.22)" stroke="#c084fc" />
                        <text x="814" y="99" textAnchor="middle" fill="#f3e8ff" fontSize="10" fontWeight="800">WoW PARK</text>

                        <rect x="748" y="114" width="132" height="26" rx="6" fill="rgba(239, 68, 68, 0.22)" stroke="#f87171" />
                        <text x="814" y="131" textAnchor="middle" fill="#fee2e2" fontSize="10" fontWeight="800">SUPER BIG</text>

                        <rect x="748" y="146" width="132" height="24" rx="6" fill="rgba(249, 115, 22, 0.22)" stroke="#fb923c" />
                        <text x="814" y="162" textAnchor="middle" fill="#ffedd5" fontSize="9.5" fontWeight="700">ZIG ZAG • BIG LAR</text>

                        <rect x="748" y="176" width="132" height="28" rx="6" fill="rgba(234, 179, 8, 0.22)" stroke="#facc15" />
                        <text x="814" y="194" textAnchor="middle" fill="#fef9c3" fontSize="9.5" fontWeight="800">PERNAMBUCANAS</text>

                        <rect x="748" y="212" width="132" height="32" rx="6" fill="rgba(56, 189, 248, 0.2)" stroke="#38bdf8" />
                        <text x="814" y="232" textAnchor="middle" fill="#e0f2fe" fontSize="12" fontWeight="800">STZ (Studio Z)</text>

                        {/* Bloco grande CINEMARK */}
                        <rect x="752" y="266" width="128" height="122" rx="14" fill="rgba(220, 38, 38, 0.30)" stroke="#ef4444" strokeWidth="1.8" />
                        <circle cx="816" cy="316" r="20" fill="#dc2626" opacity="0.85" />
                        <text x="816" y="322" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="900">C</text>
                        <text x="816" y="354" textAnchor="middle" fill="#fecaca" fontSize="12" fontWeight="800">CINEMARK</text>
                        <text x="816" y="374" textAnchor="middle" fill="#34d399" fontSize="10.5" fontWeight="800">
                          IQ {zLazer.opportunityScore} • {zLazer.footTraffic}/h
                        </text>
                      </g>

                      {/* Corredores Animados Oficiais do Térreo */}
                      <path
                        d="M 180 315 Q 450 295 726 268"
                        fill="none"
                        stroke="rgba(56, 189, 248, 0.55)"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="10 10"
                        className="animate-corridor-flow"
                      />
                      <path
                        d="M 726 268 L 726 70"
                        fill="none"
                        stroke="rgba(245, 158, 11, 0.55)"
                        strokeWidth="7"
                        strokeLinecap="round"
                        strokeDasharray="10 10"
                        className="animate-corridor-flow"
                      />
                    </g>
                  ) : (
                    /* ================= 2º PAVIMENTO — PRAÇA DE ALIMENTAÇÃO (FIEL AO PDF 2/2) ================= */
                    <g onClick={() => handleZonePick(zL2.zone)} className="cursor-pointer" filter="url(#extrude3d)">
                      {/* Sombra 3D do Leque da Praça de Alimentação */}
                      <path
                        d="M 190 95 A 220 220 0 0 0 190 465 L 340 375 L 700 375 L 890 315 L 890 245 L 700 185 L 340 185 Z"
                        fill="#020617"
                        transform="translate(10, 12)"
                        opacity="0.88"
                      />
                      {/* Contorno Oficial em Arco / Leque voltado para Oeste + Corredores para Leste */}
                      <path
                        d="M 190 95 A 220 220 0 0 0 190 465 L 340 375 L 700 375 L 890 315 L 890 245 L 700 185 L 340 185 Z"
                        fill={cL2.fill}
                        stroke={cL2.stroke}
                        strokeWidth={selectedZoneId === zL2.zone.id ? 3.5 : 2.5}
                      />

                      {/* Lojas Superiores (Arcada Norte do L2) */}
                      <rect x="200" y="92" width="118" height="72" rx="10" fill="rgba(56, 189, 248, 0.22)" stroke="#38bdf8" />
                      <text x="259" y="126" textAnchor="middle" fill="#e0f2fe" fontSize="11" fontWeight="800">MUNDO IMERSIVO</text>
                      <text x="259" y="142" textAnchor="middle" fill="#94a3b8" fontSize="9">Loja 215 • 250m²</text>

                      <rect x="330" y="88" width="95" height="66" rx="10" fill="rgba(234, 179, 8, 0.25)" stroke="#facc15" />
                      <text x="377" y="124" textAnchor="middle" fill="#fef08a" fontSize="12" fontWeight="900">McDonald&apos;s</text>

                      <rect x="434" y="102" width="76" height="58" rx="8" fill="rgba(249, 115, 22, 0.22)" stroke="#fb923c" />
                      <text x="472" y="135" textAnchor="middle" fill="#ffedd5" fontSize="10.5" fontWeight="800">SPOLETTO</text>

                      <rect x="518" y="114" width="66" height="52" rx="8" fill="rgba(239, 68, 68, 0.24)" stroke="#f87171" />
                      <text x="551" y="144" textAnchor="middle" fill="#fecaca" fontSize="10" fontWeight="800">Pizza Hut</text>

                      <rect x="592" y="120" width="98" height="50" rx="8" fill="rgba(16, 185, 129, 0.20)" stroke="#34d399" />
                      <text x="641" y="149" textAnchor="middle" fill="#d1fae5" fontSize="10" fontWeight="800">Divino Fogão</text>

                      {/* Grade Central da Praça de Mesas */}
                      <rect x="355" y="205" width="325" height="150" rx="22" fill="rgba(15, 23, 42, 0.85)" stroke="#475569" strokeDasharray="5 4" />
                      <text x="518" y="268" textAnchor="middle" fill="#f8fafc" fontSize="16" fontWeight="800">
                        PRAÇA DE ALIMENTAÇÃO (L2)
                      </text>
                      <text x="518" y="292" textAnchor="middle" fill="#fbbf24" fontSize="12" fontWeight="700">
                        Score IQ: {zL2.opportunityScore} • Fluxo/h: {zL2.footTraffic}
                      </text>
                      <text x="518" y="314" textAnchor="middle" fill="#34d399" fontSize="11">
                        Conexão Direta L1 (Escadas &amp; Esteiras Rolantes →)
                      </text>

                      {/* Lojas Inferiores (Arcada Sul do L2 + VAGAS do PDF) */}
                      <rect x="215" y="388" width="115" height="68" rx="10" fill="rgba(139, 92, 246, 0.20)" stroke="#a78bfa" />
                      <text x="272" y="424" textAnchor="middle" fill="#ede9fe" fontSize="10.5" fontWeight="800">KIN SUI • IMERSO MAR</text>

                      <rect x="342" y="395" width="76" height="60" rx="8" fill="rgba(249, 115, 22, 0.22)" stroke="#fb923c" />
                      <text x="380" y="429" textAnchor="middle" fill="#ffedd5" fontSize="11" fontWeight="800">GIRAFFAS</text>

                      {/* Espaço VAGO oficial da Planta (Loja 203 & 205) */}
                      <rect x="426" y="395" width="68" height="60" rx="8" fill="rgba(244, 63, 94, 0.28)" stroke="#fb7185" strokeWidth="2" strokeDasharray="4 3" />
                      <text x="460" y="423" textAnchor="middle" fill="#fecdd3" fontSize="10" fontWeight="900">VAGA 203</text>
                      <text x="460" y="438" textAnchor="middle" fill="#fda4af" fontSize="8.5">58,8 m²</text>

                      <rect x="502" y="395" width="58" height="60" rx="8" fill="rgba(244, 63, 94, 0.28)" stroke="#fb7185" strokeWidth="2" strokeDasharray="4 3" />
                      <text x="531" y="423" textAnchor="middle" fill="#fecdd3" fontSize="9.5" fontWeight="900">VAGA 205</text>

                      <rect x="568" y="392" width="118" height="60" rx="8" fill="rgba(16, 185, 129, 0.22)" stroke="#34d399" />
                      <text x="627" y="426" textAnchor="middle" fill="#d1fae5" fontSize="11" fontWeight="800">SUBWAY • EXPRESS</text>

                      {/* Fluxo animado das Escadas Rolantes Leste */}
                      <path
                        d="M 875 280 L 690 280 M 690 280 Q 430 220 265 180 M 690 280 Q 430 340 285 385"
                        fill="none"
                        stroke="rgba(245, 158, 11, 0.65)"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="10 10"
                        className="animate-corridor-flow"
                      />
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Controles acessíveis por teclado para selecionar cada ala */}
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Atalhos acessíveis das alas do shopping">
              {zonesTelemetry.map((telemetry) => {
                const isSelected = telemetry.zone.id === selectedZoneId;
                const colors = getHeatColors(telemetry.opportunityScore, isSelected);
                return (
                  <button
                    key={telemetry.zone.id}
                    type="button"
                    onClick={() => handleZonePick(telemetry.zone)}
                    aria-pressed={isSelected}
                    className={`px-3 py-2 rounded-xl text-xs font-medium border transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-800 border-amber-400 text-white shadow'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <MapPin className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                    <span>{telemetry.zone.shortName}</span>
                    {telemetry.cameraFeedLinked && (
                      <Camera className="w-3 h-3 text-emerald-400" aria-hidden="true" />
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${colors.badgeClass}`}>
                      {telemetry.opportunityScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes da Zona Selecionada + Espaços Vagos */}
          <SpotlightCard className="bg-slate-950 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <aside className="flex flex-col justify-between space-y-4 h-full">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                      {selectedTelemetry.zone.floor === 'L1' ? '1º Pavimento (Térreo)' : '2º Pavimento'}
                    </span>
                    <h3 className="text-base font-bold text-white mt-0.5">
                      {selectedTelemetry.zone.name}
                    </h3>
                    <p className="text-xs text-slate-400">{selectedTelemetry.zone.segment}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold">
                    IQ {selectedTelemetry.opportunityScore}
                  </span>
                </div>

                {selectedTelemetry.cameraFeedLinked && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>Sensor Câmera ativo nesta ala (somando fluxo ao vivo)</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Fluxo/hora</span>
                    <strong className="text-lg text-white">{selectedTelemetry.footTraffic}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Paradas Vitrine</span>
                    <strong className="text-lg text-emerald-400">{selectedTelemetry.vitrineStops}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Buscas QR</span>
                    <strong className="text-lg text-sky-400">{selectedTelemetry.qrSearchCount}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-slate-400 block">Vendas Perdidas</span>
                    <strong className="text-lg text-rose-400">{selectedTelemetry.lostSalesCount}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-rose-300">
                    <Flame className="w-4 h-4" aria-hidden="true" />
                    Maior Gargalo Atual:
                  </div>
                  <p className="text-slate-200">{LOST_SALE_LABELS[selectedTelemetry.dominantReason]}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
                    <Store className="w-4 h-4" aria-hidden="true" />
                    Oportunidade em {selectedTelemetry.zone.vacantSpacesCount} Espaço(s) Vago(s) da Planta:
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    {selectedTelemetry.zone.vacantOpportunityHint}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">
                Âncoras mapeadas: <span className="text-slate-200">{selectedTelemetry.zone.anchors.join(', ')}</span>
              </div>
            </aside>
          </SpotlightCard>
        </div>
      </div>

      {/* Rotas Cross-Segmentos */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-400" aria-hidden="true" />
          Fluxo &amp; Rotas Quentes Entre Segmentos (Inédito no Mercado)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <SpotlightCard
              key={route.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs"
            >
              <article className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-sky-300">
                    {route.fromLabel} → {route.toLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                    {route.sharePercent}%
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">{route.insight}</p>
                <div className="pt-2 border-t border-slate-800/80 text-amber-300 font-medium">
                  Combo IA: {route.recommendedCombo}
                </div>
              </article>
            </SpotlightCard>
          ))}
        </div>
      </div>
    </div>
  );
};
