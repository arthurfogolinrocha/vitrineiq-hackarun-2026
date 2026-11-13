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

type FlowFilter = 'all' | 'moda' | 'lazer' | 'gastro';

function getHeatColors(score: number, isSelected: boolean) {
  if (score >= 70) {
    return {
      fill: isSelected ? 'rgba(245, 158, 11, 0.22)' : 'rgba(254, 243, 199, 0.72)',
      stroke: isSelected ? '#b45309' : '#f59e0b',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-300',
      label: 'Alta Demanda',
    };
  }
  if (score >= 45) {
    return {
      fill: isSelected ? 'rgba(16, 185, 129, 0.20)' : 'rgba(209, 250, 229, 0.68)',
      stroke: isSelected ? '#047857' : '#10b981',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      label: 'Oportunidade Ativa',
    };
  }
  return {
    fill: isSelected ? 'rgba(37, 99, 235, 0.16)' : 'rgba(219, 234, 254, 0.65)',
    stroke: isSelected ? '#1d4ed8' : '#3b82f6',
    badgeClass: 'bg-blue-50 text-blue-800 border-blue-300',
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
  const [flowFilter, setFlowFilter] = useState<FlowFilter>('all');

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

  const showModa = flowFilter === 'all' || flowFilter === 'moda';
  const showLazer = flowFilter === 'all' || flowFilter === 'lazer';
  const showGastro = flowFilter === 'all' || flowFilter === 'gastro';

  return (
    <div className="space-y-6 panel-enter">
      {/* Cabeçalho Claro e Objetivo */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Compass className="w-5 h-5 text-amber-600" aria-hidden="true" />
              Mapa Capim Dourado Shopping (Planta Mix Oficial)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em qualquer ala para ver os gargalos de venda e filtrar os fluxos de circulação.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIs3D((prev) => !prev)}
              aria-pressed={is3D}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                is3D
                  ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <Box className="w-3.5 h-3.5" aria-hidden="true" />
              {is3D ? 'Maquete 3D' : 'Planta 2D'}
            </button>

            <div
              className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200"
              role="group"
              aria-label="Selecionar pavimento do shopping"
            >
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
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1º Piso — Térreo
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
                    ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                2º Piso — Alimentação
              </button>
            </div>
          </div>
        </div>

        {/* Filtro Limpo de Divisão dos Fluxos */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-slate-700 mr-1">Fluxos do Público:</span>
            <button
              type="button"
              onClick={() => setFlowFilter('all')}
              className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                flowFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFlowFilter('moda')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                flowFilter === 'moda'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-blue-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              Moda &amp; Âncoras
            </button>
            <button
              type="button"
              onClick={() => setFlowFilter('lazer')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                flowFilter === 'lazer'
                  ? 'bg-violet-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-violet-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-violet-500" />
              Lazer &amp; Cinema
            </button>
            <button
              type="button"
              onClick={() => setFlowFilter('gastro')}
              className={`px-2.5 py-1 rounded-lg font-semibold flex items-center gap-1.5 transition ${
                flowFilter === 'gastro'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-amber-50'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Gastronomia &amp; 2º Piso
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Dados agregados por ala • Zero identificação pessoal
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Planta Arquitetônica Nivelada e Clara */}
          <div className="xl:col-span-2 bg-slate-100/80 border border-slate-200 rounded-2xl p-4 relative overflow-hidden">
            <div className="map-stage-3d py-1">
              <div className={`map-plane ${is3D ? 'is-3d' : ''}`}>
                <svg
                  viewBox="0 0 1080 560"
                  role="img"
                  aria-label={`Planta arquitetônica clara do ${floor === 'L1' ? '1º Pavimento Térreo' : '2º Pavimento Praça de Alimentação'} do Capim Dourado Shopping`}
                  className="w-full h-auto rounded-xl bg-[#f8fafc] border border-slate-300 shadow-lg"
                >
                  <defs>
                    <filter id="cardShadow" x="-8%" y="-8%" width="120%" height="125%">
                      <feDropShadow dx="0" dy="6" stdDeviation="3.5" floodColor="#94a3b8" floodOpacity="0.35" />
                    </filter>
                    <pattern id="parkingLight" width="14" height="14" patternUnits="userSpaceOnUse">
                      <path d="M 14 0 L 0 0 0 14" fill="none" stroke="rgba(100, 116, 139, 0.14)" strokeWidth="1" />
                    </pattern>
                    <marker id="arrowBlue" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
                    </marker>
                    <marker id="arrowViolet" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#7c3aed" />
                    </marker>
                    <marker id="arrowAmber" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                      <path d="M 0 1 L 10 5 L 0 9 z" fill="#d97706" />
                    </marker>
                  </defs>

                  <title>Mapa Oficial Capim Dourado Shopping — VitrineIQ</title>

                  {floor === 'L1' ? (
                    /* ================= 1º PAVIMENTO — TÉRREO CLARO ================= */
                    <g>
                      {/* Ruas e Rotatórias Claras */}
                      <rect x="38" y="25" width="26" height="440" fill="#e2e8f0" stroke="#cbd5e1" />
                      <circle cx="51" cy="492" r="32" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                      <circle cx="51" cy="492" r="12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                      <text x="23" y="260" fill="#475569" fontSize="11" fontWeight="700" transform="rotate(-90 23 260)">
                        AVENIDA JK (OESTE)
                      </text>

                      <rect x="82" y="480" width="848" height="24" fill="#e2e8f0" stroke="#cbd5e1" />
                      <text x="485" y="526" fill="#475569" fontSize="11" fontWeight="700" textAnchor="middle">
                        AVENIDA NS-05 (SUL)
                      </text>

                      <circle cx="964" cy="492" r="32" fill="#e2e8f0" stroke="#cbd5e1" strokeWidth="2" />
                      <circle cx="964" cy="492" r="12" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.5" />
                      <rect x="952" y="25" width="24" height="432" fill="#e2e8f0" stroke="#cbd5e1" />
                      <text x="996" y="285" fill="#475569" fontSize="11" fontWeight="700" transform="rotate(-90 996 285)">
                        AVENIDA LO 2A (LESTE)
                      </text>

                      {/* Estacionamentos */}
                      <path
                        d="M 105 186 L 690 48 L 895 48 L 895 140 L 105 232 Z"
                        fill="url(#parkingLight)"
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                      />
                      <text x="285" y="132" fill="#64748b" fontSize="10" fontWeight="700" transform="rotate(-13 285 132)">
                        ESTACIONAMENTO NORTE
                      </text>

                      <rect
                        x="185"
                        y="420"
                        width="725"
                        height="44"
                        rx="6"
                        fill="url(#parkingLight)"
                        stroke="#cbd5e1"
                        strokeDasharray="4 4"
                      />
                      <text x="455" y="446" fill="#64748b" fontSize="10" fontWeight="700">
                        ESTACIONAMENTO SUL
                      </text>

                      {/* Base Extrudada de Maquete 3D do Prédio (Sombra sólida embaixo, reta) */}
                      <path
                        d="M 96 292 C 88 380, 128 416, 210 412 L 485 412 L 545 432 L 735 412 L 908 412 L 908 18 L 725 56 L 685 162 L 572 130 L 420 150 L 325 220 L 96 248 Z"
                        fill="#cbd5e1"
                        transform="translate(0, 10)"
                      />
                      <path
                        d="M 96 292 C 88 380, 128 416, 210 412 L 485 412 L 545 432 L 735 412 L 908 412 L 908 18 L 725 56 L 685 162 L 572 130 L 420 150 L 325 220 L 96 248 Z"
                        fill="#ffffff"
                        stroke="#94a3b8"
                        strokeWidth="2"
                      />

                      {/* ALA 1: ALA SUL — RENNER / CENTAURO */}
                      <g
                        onClick={() => handleZonePick(zSul.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#cardShadow)"
                      >
                        <path
                          d="M 104 292 C 98 372, 134 404, 210 402 L 384 402 L 384 246 L 104 256 Z"
                          fill={cSul.fill}
                          stroke={cSul.stroke}
                          strokeWidth={selectedZoneId === zSul.zone.id ? 3.5 : 1.8}
                        />
                        <rect x="118" y="284" width="90" height="86" rx="16" fill="#ffffff" stroke="#e11d48" strokeWidth="1.5" />
                        <text x="163" y="331" textAnchor="middle" fill="#be123c" fontSize="12" fontWeight="800">RENNER</text>

                        <rect x="232" y="350" width="132" height="40" rx="8" fill="#ffffff" stroke="#fb7185" strokeWidth="1.3" />
                        <text x="298" y="374" textAnchor="middle" fill="#9f1239" fontSize="11" fontWeight="700">CENTAURO</text>

                        <rect x="232" y="264" width="132" height="34" rx="8" fill="#ffffff" stroke="#cbd5e1" />
                        <text x="298" y="285" textAnchor="middle" fill="#334155" fontSize="10" fontWeight="600">Stilo • Resolve</text>

                        <text x="120" y="272" fill="#0f172a" fontSize="11" fontWeight="800">
                          Ala Sul • IQ {zSul.opportunityScore}
                        </text>
                      </g>

                      {/* ALA 2: ALA CENTRAL — RCHLO / C&A / LEITURA */}
                      <g
                        onClick={() => handleZonePick(zCentral.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#cardShadow)"
                      >
                        <path
                          d="M 394 156 L 568 136 L 682 170 L 682 322 L 394 322 Z"
                          fill={cCentral.fill}
                          stroke={cCentral.stroke}
                          strokeWidth={selectedZoneId === zCentral.zone.id ? 3.5 : 1.8}
                        />
                        <rect x="448" y="154" width="102" height="54" rx="10" fill="#ffffff" stroke="#0284c7" strokeWidth="1.5" />
                        <text x="499" y="185" textAnchor="middle" fill="#0369a1" fontSize="13" fontWeight="800">C&amp;A</text>

                        <rect x="574" y="182" width="92" height="40" rx="8" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.3" transform="rotate(12 620 202)" />
                        <text x="619" y="206" textAnchor="middle" fill="#5b21b6" fontSize="10.5" fontWeight="700" transform="rotate(12 619 206)">leitura</text>

                        <rect x="440" y="228" width="138" height="54" rx="10" fill="#ffffff" stroke="#475569" strokeWidth="1.5" />
                        <text x="509" y="259" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="800">RCHLO</text>

                        <text x="404" y="310" fill="#0f172a" fontSize="11" fontWeight="800">
                          Ala Central • IQ {zCentral.opportunityScore} • {zCentral.footTraffic}/h
                        </text>
                      </g>

                      {/* ALA 3: ALAMEDA GOURMET — OUTBACK / MADERO / MARISA */}
                      <g
                        onClick={() => handleZonePick(zGourmet.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#cardShadow)"
                      >
                        <path
                          d="M 394 332 L 732 332 L 732 406 L 545 424 L 485 406 L 394 406 Z"
                          fill={cGourmet.fill}
                          stroke={cGourmet.stroke}
                          strokeWidth={selectedZoneId === zGourmet.zone.id ? 3.5 : 1.8}
                        />
                        <rect x="496" y="352" width="76" height="44" rx="8" fill="#ffffff" stroke="#dc2626" strokeWidth="1.4" />
                        <text x="534" y="378" textAnchor="middle" fill="#991b1b" fontSize="10.5" fontWeight="800">OUTBACK</text>

                        <rect x="580" y="352" width="64" height="44" rx="8" fill="#ffffff" stroke="#d97706" strokeWidth="1.4" />
                        <text x="612" y="378" textAnchor="middle" fill="#92400e" fontSize="10" fontWeight="700">MADERO</text>

                        <rect x="652" y="352" width="70" height="44" rx="8" fill="#ffffff" stroke="#db2777" strokeWidth="1.4" />
                        <text x="687" y="378" textAnchor="middle" fill="#9d174d" fontSize="10.5" fontWeight="800">marisa</text>

                        <text x="404" y="354" fill="#0f172a" fontSize="10.5" fontWeight="800">
                          Alameda Gourmet • IQ {zGourmet.opportunityScore}
                        </text>
                      </g>

                      {/* ALA 4: ALA LESTE — CINEMARK / STZ / PERNAMBUCANAS / BIG / WOW / MOROFIT */}
                      <g
                        onClick={() => handleZonePick(zLazer.zone)}
                        className="cursor-pointer transition-opacity hover:opacity-95"
                        filter="url(#cardShadow)"
                      >
                        <path
                          d="M 692 170 L 732 58 L 902 24 L 902 404 L 740 404 L 740 326 L 692 326 Z"
                          fill={cLazer.fill}
                          stroke={cLazer.stroke}
                          strokeWidth={selectedZoneId === zLazer.zone.id ? 3.5 : 1.8}
                        />
                        <rect x="752" y="48" width="132" height="27" rx="6" fill="#ffffff" stroke="#10b981" />
                        <text x="818" y="65" textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="800">MOROFIT</text>

                        <rect x="752" y="81" width="132" height="26" rx="6" fill="#ffffff" stroke="#8b5cf6" />
                        <text x="818" y="98" textAnchor="middle" fill="#5b21b6" fontSize="10" fontWeight="800">WoW PARK</text>

                        <rect x="752" y="113" width="132" height="26" rx="6" fill="#ffffff" stroke="#ef4444" />
                        <text x="818" y="130" textAnchor="middle" fill="#991b1b" fontSize="10" fontWeight="800">SUPER BIG</text>

                        <rect x="752" y="145" width="132" height="24" rx="6" fill="#ffffff" stroke="#f97316" />
                        <text x="818" y="161" textAnchor="middle" fill="#9a3412" fontSize="9.5" fontWeight="700">ZIG ZAG • BIG LAR</text>

                        <rect x="752" y="175" width="132" height="27" rx="6" fill="#ffffff" stroke="#eab308" />
                        <text x="818" y="192" textAnchor="middle" fill="#854d0e" fontSize="9.5" fontWeight="800">PERNAMBUCANAS</text>

                        <rect x="752" y="210" width="132" height="32" rx="6" fill="#ffffff" stroke="#0284c7" />
                        <text x="818" y="230" textAnchor="middle" fill="#075985" fontSize="11.5" fontWeight="800">STZ (Studio Z)</text>

                        <rect x="752" y="262" width="132" height="128" rx="12" fill="#ffffff" stroke="#dc2626" strokeWidth="1.8" />
                        <circle cx="818" cy="306" r="19" fill="#dc2626" />
                        <text x="818" y="313" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="900">C</text>
                        <text x="818" y="344" textAnchor="middle" fill="#991b1b" fontSize="11.5" fontWeight="800">CINEMARK</text>
                        <text x="818" y="366" textAnchor="middle" fill="#047857" fontSize="10.5" fontWeight="800">
                          IQ {zLazer.opportunityScore} • {zLazer.footTraffic}/h
                        </text>
                      </g>

                      {/* ================= FLUXOS CLARAMENTE DIVIDIDOS ================= */}
                      {/* 1. Fluxo Moda & Âncoras (Azul Royal — corredor central Leste-Oeste) */}
                      {showModa && (
                        <path
                          d="M 218 320 L 425 292 L 716 266"
                          fill="none"
                          stroke="#2563eb"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray="10 8"
                          markerEnd="url(#arrowBlue)"
                          className="animate-corridor-flow"
                        />
                      )}

                      {/* 2. Fluxo Lazer & Pós-Cinema (Violeta — Ala Leste Norte-Sul) */}
                      {showLazer && (
                        <path
                          d="M 730 78 L 728 242 L 736 318"
                          fill="none"
                          stroke="#7c3aed"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray="10 8"
                          markerEnd="url(#arrowViolet)"
                          className="animate-corridor-flow"
                        />
                      )}

                      {/* 3. Fluxo Gastronomia & Escada L2 (Dourado — Central para Alameda Gourmet) */}
                      {showGastro && (
                        <path
                          d="M 620 288 Q 570 335 535 348"
                          fill="none"
                          stroke="#d97706"
                          strokeWidth="4.5"
                          strokeLinecap="round"
                          strokeDasharray="10 8"
                          markerEnd="url(#arrowAmber)"
                          className="animate-corridor-flow"
                        />
                      )}
                    </g>
                  ) : (
                    /* ================= 2º PAVIMENTO — PRAÇA DE ALIMENTAÇÃO CLARA ================= */
                    <g onClick={() => handleZonePick(zL2.zone)} className="cursor-pointer">
                      {/* Base Extrudada de Maquete 3D do Leque */}
                      <path
                        d="M 190 95 A 220 220 0 0 0 190 465 L 340 375 L 700 375 L 890 315 L 890 245 L 700 185 L 340 185 Z"
                        fill="#cbd5e1"
                        transform="translate(0, 10)"
                      />
                      <path
                        d="M 190 95 A 220 220 0 0 0 190 465 L 340 375 L 700 375 L 890 315 L 890 245 L 700 185 L 340 185 Z"
                        fill={cL2.fill}
                        stroke={cL2.stroke}
                        strokeWidth={selectedZoneId === zL2.zone.id ? 3.5 : 2}
                      />

                      {/* Lojas Superiores */}
                      <rect x="200" y="96" width="118" height="68" rx="10" fill="#ffffff" stroke="#0284c7" strokeWidth="1.4" />
                      <text x="259" y="128" textAnchor="middle" fill="#075985" fontSize="11" fontWeight="800">MUNDO IMERSIVO</text>
                      <text x="259" y="145" textAnchor="middle" fill="#64748b" fontSize="9">Loja 215 • 250m²</text>

                      <rect x="328" y="92" width="96" height="64" rx="10" fill="#ffffff" stroke="#eab308" strokeWidth="1.5" />
                      <text x="376" y="128" textAnchor="middle" fill="#b45309" fontSize="12" fontWeight="900">McDonald&apos;s</text>

                      <rect x="434" y="106" width="76" height="54" rx="8" fill="#ffffff" stroke="#f97316" strokeWidth="1.3" />
                      <text x="472" y="137" textAnchor="middle" fill="#c2410c" fontSize="10.5" fontWeight="800">SPOLETTO</text>

                      <rect x="518" y="116" width="68" height="48" rx="8" fill="#ffffff" stroke="#ef4444" strokeWidth="1.3" />
                      <text x="552" y="144" textAnchor="middle" fill="#b91c1c" fontSize="10" fontWeight="800">Pizza Hut</text>

                      <rect x="594" y="122" width="96" height="46" rx="8" fill="#ffffff" stroke="#10b981" strokeWidth="1.3" />
                      <text x="642" y="149" textAnchor="middle" fill="#047857" fontSize="10" fontWeight="800">Divino Fogão</text>

                      {/* Grade Central da Praça de Mesas */}
                      <rect x="355" y="205" width="325" height="150" rx="22" fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                      <text x="518" y="266" textAnchor="middle" fill="#0f172a" fontSize="16" fontWeight="800">
                        PRAÇA DE ALIMENTAÇÃO (2º PISO)
                      </text>
                      <text x="518" y="290" textAnchor="middle" fill="#d97706" fontSize="12" fontWeight="800">
                        Score IQ: {zL2.opportunityScore} • Fluxo/h: {zL2.footTraffic}
                      </text>
                      <text x="518" y="314" textAnchor="middle" fill="#059669" fontSize="11" fontWeight="600">
                        Acesso Escadas &amp; Esteiras Rolantes →
                      </text>

                      {/* Lojas Inferiores + VAGAS */}
                      <rect x="215" y="390" width="115" height="64" rx="10" fill="#ffffff" stroke="#7c3aed" strokeWidth="1.3" />
                      <text x="272" y="425" textAnchor="middle" fill="#5b21b6" fontSize="10.5" fontWeight="800">KIN SUI • MAR</text>

                      <rect x="342" y="395" width="76" height="58" rx="8" fill="#ffffff" stroke="#f97316" strokeWidth="1.3" />
                      <text x="380" y="428" textAnchor="middle" fill="#c2410c" fontSize="11" fontWeight="800">GIRAFFAS</text>

                      <rect x="426" y="395" width="68" height="58" rx="8" fill="#fff1f2" stroke="#e11d48" strokeWidth="2" strokeDasharray="4 3" />
                      <text x="460" y="422" textAnchor="middle" fill="#be123c" fontSize="10" fontWeight="900">VAGA 203</text>
                      <text x="460" y="437" textAnchor="middle" fill="#e11d48" fontSize="8.5">58,8 m²</text>

                      <rect x="502" y="395" width="58" height="58" rx="8" fill="#fff1f2" stroke="#e11d48" strokeWidth="2" strokeDasharray="4 3" />
                      <text x="531" y="425" textAnchor="middle" fill="#be123c" fontSize="9.5" fontWeight="900">VAGA 205</text>

                      <rect x="568" y="392" width="118" height="58" rx="8" fill="#ffffff" stroke="#10b981" strokeWidth="1.3" />
                      <text x="627" y="425" textAnchor="middle" fill="#047857" fontSize="11" fontWeight="800">SUBWAY • EXPRESS</text>

                      {/* Fluxo Alimentação L2 dividido */}
                      {(showGastro || showLazer) && (
                        <>
                          <path
                            d="M 865 280 L 690 280 Q 470 225 290 175"
                            fill="none"
                            stroke="#d97706"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray="10 8"
                            markerEnd="url(#arrowAmber)"
                            className="animate-corridor-flow"
                          />
                          <path
                            d="M 690 280 Q 470 335 295 385"
                            fill="none"
                            stroke="#7c3aed"
                            strokeWidth="4.5"
                            strokeLinecap="round"
                            strokeDasharray="10 8"
                            markerEnd="url(#arrowViolet)"
                            className="animate-corridor-flow"
                          />
                        </>
                      )}
                    </g>
                  )}
                </svg>
              </div>
            </div>

            {/* Legenda Limpa + Atalhos */}
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Atalhos das alas do shopping">
              {zonesTelemetry.map((telemetry) => {
                const isSelected = telemetry.zone.id === selectedZoneId;
                const colors = getHeatColors(telemetry.opportunityScore, isSelected);
                return (
                  <button
                    key={telemetry.zone.id}
                    type="button"
                    onClick={() => handleZonePick(telemetry.zone)}
                    aria-pressed={isSelected}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-2 ${
                      isSelected
                        ? 'bg-slate-900 border-slate-900 text-white shadow-sm'
                        : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-amber-600'}`} aria-hidden="true" />
                    <span>{telemetry.zone.shortName}</span>
                    {telemetry.cameraFeedLinked && (
                      <Camera className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                    )}
                    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${colors.badgeClass}`}>
                      {telemetry.opportunityScore}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detalhes da Zona Selecionada */}
          <SpotlightCard className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col justify-between space-y-4">
            <aside className="flex flex-col justify-between space-y-4 h-full">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                      {selectedTelemetry.zone.floor === 'L1' ? '1º Pavimento (Térreo)' : '2º Pavimento'}
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                      {selectedTelemetry.zone.name}
                    </h3>
                    <p className="text-xs text-slate-500">{selectedTelemetry.zone.segment}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 font-mono text-xs font-bold shrink-0">
                    IQ {selectedTelemetry.opportunityScore}
                  </span>
                </div>

                {selectedTelemetry.cameraFeedLinked && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 font-semibold flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                    <span>Sensor Câmera ativo nesta ala (somando fluxo ao vivo)</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block">Fluxo/hora</span>
                    <strong className="text-lg text-slate-900">{selectedTelemetry.footTraffic}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block">Paradas Vitrine</span>
                    <strong className="text-lg text-emerald-600">{selectedTelemetry.vitrineStops}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block">Buscas QR</span>
                    <strong className="text-lg text-blue-600">{selectedTelemetry.qrSearchCount}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-slate-500 block">Vendas Perdidas</span>
                    <strong className="text-lg text-rose-600">{selectedTelemetry.lostSalesCount}</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-white border border-rose-200 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-rose-700">
                    <Flame className="w-4 h-4" aria-hidden="true" />
                    Maior Gargalo Atual:
                  </div>
                  <p className="text-slate-700 font-medium">{LOST_SALE_LABELS[selectedTelemetry.dominantReason]}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-indigo-800">
                    <Store className="w-4 h-4" aria-hidden="true" />
                    Oportunidade em {selectedTelemetry.zone.vacantSpacesCount} Espaço(s) Vago(s):
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    {selectedTelemetry.zone.vacantOpportunityHint}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 text-[11px] text-slate-500">
                Âncoras mapeadas: <span className="text-slate-800 font-medium">{selectedTelemetry.zone.anchors.join(', ')}</span>
              </div>
            </aside>
          </SpotlightCard>
        </div>
      </div>

      {/* Rotas Cross-Segmentos */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Rotas Quentes Entre Segmentos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {routes.map((route) => (
            <SpotlightCard
              key={route.id}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
            >
              <article className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-blue-700">
                    {route.fromLabel} → {route.toLabel}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                    {route.sharePercent}%
                  </span>
                </div>
                <p className="text-slate-600 leading-relaxed">{route.insight}</p>
                <div className="pt-2 border-t border-slate-200 text-amber-800 font-semibold">
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
