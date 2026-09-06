import React from "react";
import {
  Layers,
  Layout,
  Type,
  Palette,
  Download,
  Copy,
  ExternalLink,
  Share2,
  Play,
  Sliders,
  Grid,
  Image as ImageIcon,
  MousePointer,
  Hand,
  Maximize2,
  Eye,
  Settings,
  Code,
  FileJson,
  Check,
  Info,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Lock,
  ArrowRight,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FigmaWorkspaceProps {
  onClose?: () => void;
}

type FigmaPage = "tokens" | "typography" | "components" | "mockups" | "export";

export default function FigmaWorkspace({ onClose }: FigmaWorkspaceProps) {
  const [activePage, setActivePage] = React.useState<FigmaPage>("tokens");
  const [selectedElement, setSelectedElement] = React.useState<string>("palette-gold");
  const [copiedText, setCopiedText] = React.useState<string | null>(null);
  const [scale, setScale] = React.useState<number>(100);
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  const [inspectTab, setInspectTab] = React.useState<"design" | "inspect">("design");

  // Mock export action
  const [isExporting, setIsExporting] = React.useState(false);
  const [exportSuccess, setExportSuccess] = React.useState(false);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

      // Trigger a raw JSON download of Figma design system tokens
      const tokenSpecs = {
        name: "VERO Accessories Design System",
        version: "1.0.0",
        brand: "VERO",
        philosophy: "Quiet Luxury, Artisanal Quality, Sustainable Restraint",
        colorPalette: {
          brandGold: { hex: "#6A5C47", tailwind: "bg-brand-gold", description: "Primary brand accent color representing heritage and refined solid gold." },
          brandLinen: { hex: "#F5EFEB", tailwind: "bg-brand-linen", description: "Background canvas representing clean, sustainable Mediterranean linen textures." },
          brandUmber: { hex: "#211B12", tailwind: "bg-brand-umber", description: "Primary typography and structure color representing deep charcoal and Italian wood." },
          brandOutline: { hex: "#8A817C", tailwind: "bg-brand-outline", description: "Secondary text and borders indicating subtle lines." },
          brandSurfaceLow: { hex: "#EDE6E0", tailwind: "bg-brand-surface-low", description: "Subtle background cards and container fillings." }
        },
        typography: {
          displayFont: "Playfair Display",
          sansFont: "Inter",
          monoFont: "JetBrains Mono",
          styles: {
            h1: { size: "48px", weight: "500", tracking: "-0.02em" },
            h2: { size: "32px", weight: "400", tracking: "0.05em" },
            body: { size: "14px", weight: "300", tracking: "0.02em" },
            meta: { size: "10px", weight: "600", tracking: "0.2em" }
          }
        },
        components: [
          "Bespoke Button", "Product Card Grid", "Luxury Navigation Header", "Dynamic Checkout Drawer"
        ]
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tokenSpecs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "vero_design_tokens_figma.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    }, 1500);
  };

  // Selected elements metadata dictionary for the Figma Inspector
  const elementSpecs: Record<string, {
    name: string;
    type: string;
    dimensions: string;
    properties: { label: string; value: string }[];
    codeTailwind: string;
    codeCSS: string;
  }> = {
    "palette-gold": {
      name: "Color: Brand Gold (Heritage)",
      type: "Color Style",
      dimensions: "160 x 160 px",
      properties: [
        { label: "Hex Code", value: "#6A5C47" },
        { label: "RGB", value: "rgb(106, 92, 71)" },
        { label: "HSL", value: "36°, 20%, 35%" },
        { label: "Opacity", value: "100%" },
        { label: "Role", value: "Primary Accent & Solid Gold Forging" }
      ],
      codeTailwind: "bg-[#6A5C47] text-white hover:bg-[#211B12]",
      codeCSS: "background-color: #6a5c47;\ncolor: #ffffff;\ntransition: all 0.3s ease;"
    },
    "palette-linen": {
      name: "Color: Brand Linen",
      type: "Color Style",
      dimensions: "160 x 160 px",
      properties: [
        { label: "Hex Code", value: "#F5EFEB" },
        { label: "RGB", value: "rgb(245, 239, 235)" },
        { label: "HSL", value: "24°, 23%, 94%" },
        { label: "Opacity", value: "100%" },
        { label: "Role", value: "Page Canvas Background / Sand Tone" }
      ],
      codeTailwind: "bg-[#F5EFEB]",
      codeCSS: "background-color: #f5efeb;"
    },
    "palette-umber": {
      name: "Color: Brand Umber (Charcoal)",
      type: "Color Style",
      dimensions: "160 x 160 px",
      properties: [
        { label: "Hex Code", value: "#211B12" },
        { label: "RGB", value: "rgb(33, 27, 18)" },
        { label: "HSL", value: "36°, 29%, 10%" },
        { label: "Opacity", value: "100%" },
        { label: "Role", value: "Primary Text, Deep Wood Contrasts" }
      ],
      codeTailwind: "text-[#211B12]",
      codeCSS: "color: #211b12;"
    },
    "typo-display": {
      name: "Typography: Playfair Display",
      type: "Font Face Spec",
      dimensions: "Auto-layout",
      properties: [
        { label: "Family", value: "Playfair Display, Georgia, serif" },
        { label: "Weight", value: "Medium (500)" },
        { label: "Size", value: "36px / 2.25rem" },
        { label: "Line Height", value: "1.2 (120%)" },
        { label: "Letter Spacing", value: "0.025em" }
      ],
      codeTailwind: "font-serif text-3xl md:text-4xl tracking-wide text-brand-umber",
      codeCSS: "font-family: 'Playfair Display', serif;\nfont-size: 2.25rem;\nfont-weight: 500;\nletter-spacing: 0.025em;\ncolor: #211b12;"
    },
    "typo-sans": {
      name: "Typography: Inter Regular",
      type: "Font Face Spec",
      dimensions: "Auto-layout",
      properties: [
        { label: "Family", value: "Inter, sans-serif" },
        { label: "Weight", value: "Light (300)" },
        { label: "Size", value: "14px / 0.875rem" },
        { label: "Line Height", value: "1.625 (162%)" },
        { label: "Letter Spacing", value: "0.01em" }
      ],
      codeTailwind: "font-sans text-xs md:text-sm text-brand-outline font-light leading-relaxed",
      codeCSS: "font-family: 'Inter', sans-serif;\nfont-size: 0.875rem;\nfont-weight: 300;\nline-height: 1.625;\ncolor: #8a817c;"
    },
    "comp-button": {
      name: "Component: Bespoke Luxury Button",
      type: "Master Component ❖",
      dimensions: "280 x 56 px",
      properties: [
        { label: "Background", value: "#6A5C47 (Gold)" },
        { label: "Hover State", value: "#211B12 (Umber)" },
        { label: "Padding", value: "16px vertical, 40px horizontal" },
        { label: "Border Radius", value: "2px (Minimalist Slate)" },
        { label: "Letter Spacing", value: "0.2em (Widest Tracking)" }
      ],
      codeTailwind: "bg-brand-gold hover:bg-brand-umber text-white font-sans text-xs font-semibold py-4 px-10 uppercase tracking-[0.2em] transition-all duration-300 shadow-sm",
      codeCSS: "display: inline-flex;\nalign-items: center;\njustify-content: center;\nbackground-color: #6a5c47;\ncolor: #ffffff;\npadding: 1rem 2.5rem;\nfont-family: 'Inter', sans-serif;\nfont-size: 0.75rem;\nfont-weight: 600;\ntext-transform: uppercase;\nletter-spacing: 0.2em;\nborder-radius: 2px;\ntransition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);"
    }
  };

  const currentSpec = elementSpecs[selectedElement] || elementSpecs["palette-gold"];

  return (
    <div className="flex flex-col h-[85vh] bg-[#1E1E1E] text-[#E3E3E3] rounded-lg border border-[#333333] overflow-hidden font-sans shadow-2xl relative select-text">
      {/* Figma Simulation Top Header */}
      <div className="bg-[#2C2C2C] border-b border-[#3E3E3E] h-12 flex items-center justify-between px-4 select-none">
        {/* Left Actions */}
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-gradient-to-tr from-[#F24E1E] via-[#A259FF] to-[#1ABC9C] rounded flex items-center justify-center font-bold text-white text-xs shadow-md">
            F
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white">
            <span className="font-light text-gray-400">Drafts</span>
            <span className="text-gray-500">/</span>
            <span className="font-medium tracking-wide">VERO Accessories UI Design Spec</span>
            <div className="bg-[#3E3E3E] text-[9px] px-1.5 py-0.5 rounded text-gray-300 ml-1.5 border border-white/5 uppercase tracking-wider font-semibold">
              v1.0
            </div>
          </div>
        </div>

        {/* Center Canvas Tools */}
        <div className="hidden md:flex items-center bg-[#1E1E1E]/80 border border-[#3E3E3E] rounded-md px-1 py-0.5 shadow-inner">
          <button className="p-1.5 hover:bg-[#2C2C2C] text-[#A259FF] rounded-md transition-colors" title="Move Tool">
            <MousePointer className="w-3.5 h-3.5" />
          </button>
          <button className="p-1.5 hover:bg-[#2C2C2C] text-gray-400 rounded-md transition-colors" title="Hand Tool">
            <Hand className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3.5 bg-[#3E3E3E] mx-1" />
          <button
            onClick={() => setActivePage("tokens")}
            className={`px-2.5 py-1 text-[11px] rounded transition-all ${
              activePage === "tokens" ? "bg-[#2C2C2C] text-white font-medium" : "text-gray-400 hover:text-white"
            }`}
          >
            Tokens
          </button>
          <button
            onClick={() => setActivePage("components")}
            className={`px-2.5 py-1 text-[11px] rounded transition-all ${
              activePage === "components" ? "bg-[#2C2C2C] text-white font-medium" : "text-gray-400 hover:text-white"
            }`}
          >
            Components
          </button>
          <button
            onClick={() => setActivePage("mockups")}
            className={`px-2.5 py-1 text-[11px] rounded transition-all ${
              activePage === "mockups" ? "bg-[#2C2C2C] text-white font-medium" : "text-gray-400 hover:text-white"
            }`}
          >
            Mockup
          </button>
        </div>

        {/* Right Info Controls */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-[#1E1E1E] border border-[#3E3E3E] px-2 py-1 rounded text-[10px] text-gray-400 select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Inspector Connected</span>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="bg-brand-gold hover:bg-brand-gold/80 text-white text-[11px] font-medium px-3 py-1.5 rounded-sm shadow-sm transition-all flex items-center gap-1.5"
          >
            {isExporting ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Download className="w-3 h-3" />
            )}
            <span>Export Specs</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-1"
              aria-label="Exit Figma View"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Figma Workspace Split Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Layers & Pages (Collapsible) */}
        {sidebarOpen && (
          <div className="w-60 bg-[#2C2C2C] border-r border-[#3E3E3E] flex flex-col justify-between select-none">
            {/* Top: Page Directory */}
            <div className="p-3.5 space-y-4">
              <div>
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span>Pages</span>
                  <Sliders className="w-3 h-3" />
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setActivePage("tokens");
                      setSelectedElement("palette-gold");
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-all text-left ${
                      activePage === "tokens"
                        ? "bg-[#1E1E1E] text-[#A259FF] font-medium"
                        : "text-gray-300 hover:bg-[#3E3E3E]"
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>❖ Brand Palette</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage("typography");
                      setSelectedElement("typo-display");
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-all text-left ${
                      activePage === "typography"
                        ? "bg-[#1E1E1E] text-[#A259FF] font-medium"
                        : "text-gray-300 hover:bg-[#3E3E3E]"
                    }`}
                  >
                    <Type className="w-3.5 h-3.5" />
                    <span>❖ Typography System</span>
                  </button>

                  <button
                    onClick={() => {
                      setActivePage("components");
                      setSelectedElement("comp-button");
                    }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-all text-left ${
                      activePage === "components"
                        ? "bg-[#1E1E1E] text-[#A259FF] font-medium"
                        : "text-gray-300 hover:bg-[#3E3E3E]"
                    }`}
                  >
                    <Layout className="w-3.5 h-3.5" />
                    <span>❖ Master Components</span>
                  </button>

                  <button
                    onClick={() => setActivePage("mockups")}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded transition-all text-left ${
                      activePage === "mockups"
                        ? "bg-[#1E1E1E] text-[#A259FF] font-medium"
                        : "text-gray-300 hover:bg-[#3E3E3E]"
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>❖ Figma Mockup Canvas</span>
                  </button>
                </div>
              </div>

              {/* Layers List for active frame */}
              <div className="pt-2 border-t border-[#3E3E3E]">
                <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                  Layers (Figma Frames)
                </h4>
                <div className="space-y-1 font-mono text-[10px] text-gray-400 pl-1">
                  {activePage === "tokens" && (
                    <>
                      <div
                        onClick={() => setSelectedElement("palette-gold")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "palette-gold" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#A259FF]">■</span> Color: Gold Accent
                      </div>
                      <div
                        onClick={() => setSelectedElement("palette-linen")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "palette-linen" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#A259FF]">■</span> Color: Sand Linen
                      </div>
                      <div
                        onClick={() => setSelectedElement("palette-umber")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "palette-umber" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#A259FF]">■</span> Color: Deep Umber
                      </div>
                    </>
                  )}

                  {activePage === "typography" && (
                    <>
                      <div
                        onClick={() => setSelectedElement("typo-display")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "typo-display" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#0ACF83]">T</span> Heading: Serif Display
                      </div>
                      <div
                        onClick={() => setSelectedElement("typo-sans")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "typo-sans" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#0ACF83]">T</span> Body: Inter Sans-serif
                      </div>
                    </>
                  )}

                  {activePage === "components" && (
                    <>
                      <div
                        onClick={() => setSelectedElement("comp-button")}
                        className={`flex items-center gap-1.5 py-1 px-1.5 rounded cursor-pointer ${
                          selectedElement === "comp-button" ? "bg-[#3E3E3E] text-white" : "hover:bg-[#3E3E3E]/50"
                        }`}
                      >
                        <span className="text-[#A259FF]">❖</span> Button: Primary
                      </div>
                    </>
                  )}

                  {activePage === "mockups" && (
                    <div className="flex items-center gap-1.5 py-1 px-1.5 rounded text-gray-500">
                      <span className="text-gray-600">■</span> HighFidelityCanvas.jpg
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bottom Brand Philosophy Note */}
            <div className="p-4 bg-[#1E1E1E]/40 border-t border-[#3E3E3E] m-2 rounded-md space-y-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-gold uppercase tracking-widest">
                <Sparkles className="w-3.5 h-3.5" />
                <span>VERO Design System</span>
              </div>
              <p className="text-[9px] text-gray-400 font-light leading-relaxed">
                This Figma spec matches our code's exact design guidelines. Modify properties on the right to preview.
              </p>
            </div>
          </div>
        )}

        {/* Middle Area: Interactive Canvas Workspace */}
        <div className="flex-1 bg-[#191919] relative overflow-hidden flex items-center justify-center p-6 md:p-10">
          {/* Zoom/Info bar overlays inside canvas */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-[#2C2C2C] hover:bg-[#3E3E3E] border border-[#3E3E3E] p-2 rounded text-xs text-gray-300 transition-all flex items-center gap-1.5 shadow-md"
              title="Toggle Sidebar"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[10px] font-medium hidden sm:inline">Sidebar</span>
            </button>
          </div>

          <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-[#2C2C2C] border border-[#3E3E3E] rounded px-3 py-1.5 text-xs text-gray-300 shadow-md">
            <span>Scale:</span>
            <button
              onClick={() => setScale(Math.max(50, scale - 10))}
              className="px-1 hover:text-white font-mono font-bold"
            >
              -
            </button>
            <span className="font-mono px-1.5 text-white">{scale}%</span>
            <button
              onClick={() => setScale(Math.min(150, scale + 10))}
              className="px-1 hover:text-white font-mono font-bold"
            >
              +
            </button>
          </div>

          {/* Canvas grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#333333_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

          {/* Interactive Figma Frame Card Container */}
          <motion.div
            style={{ scale: scale / 100 }}
            className="w-full max-w-2xl bg-[#1E1E1E] border border-[#333333] shadow-2xl rounded-sm p-8 md:p-12 relative transition-all duration-300"
          >
            {/* Fine design lines representing figma margins & rulers */}
            <div className="absolute -top-3 left-0 text-[9px] font-mono text-gray-500 select-none">X: 200 Y: 120</div>
            <div className="absolute -left-3 top-0 text-[9px] font-mono text-gray-500 origin-bottom-left -rotate-90 select-none">H: 480</div>

            {/* ARTBOARD Frame Border */}
            <div className="absolute -top-6 left-0 bg-[#A259FF] text-white text-[9.5px] font-mono px-2 py-0.5 rounded-t-sm shadow-sm select-none flex items-center gap-1">
              <span>Frame:</span>
              <span className="font-bold">
                {activePage === "tokens" && "❖ Colors & Swatches"}
                {activePage === "typography" && "❖ Typography Specs"}
                {activePage === "components" && "❖ Component Forge"}
                {activePage === "mockups" && "❖ Desktop Landing View"}
              </span>
            </div>

            {/* Artboard Content based on active Page Selection */}
            <div className="min-h-[300px] flex flex-col justify-between">
              {activePage === "tokens" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-serif text-2xl text-white mb-2 font-normal">Brand Colors</h3>
                    <p className="text-xs text-gray-400 font-light max-w-md">
                      Interactive color styles defined in the VERO digital brand guidelines. Click a color swatch below to inspect and copy styling classes in Figma's inspector.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    {/* Swatch: Brand Gold */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedElement("palette-gold")}
                      className={`cursor-pointer rounded-sm overflow-hidden border transition-all ${
                        selectedElement === "palette-gold"
                          ? "border-[#A259FF] ring-2 ring-[#A259FF]/30 scale-[1.02]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="h-28 bg-[#6A5C47]" />
                      <div className="p-3 bg-[#2A2A2A] text-left space-y-1">
                        <div className="text-[11px] font-bold text-white uppercase tracking-wider">Gold Accent</div>
                        <div className="text-[10px] font-mono text-gray-400">#6A5C47</div>
                      </div>
                    </motion.div>

                    {/* Swatch: Brand Linen */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedElement("palette-linen")}
                      className={`cursor-pointer rounded-sm overflow-hidden border transition-all ${
                        selectedElement === "palette-linen"
                          ? "border-[#A259FF] ring-2 ring-[#A259FF]/30 scale-[1.02]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="h-28 bg-[#F5EFEB]" />
                      <div className="p-3 bg-[#2A2A2A] text-left space-y-1">
                        <div className="text-[11px] font-bold text-white uppercase tracking-wider">Sand Linen</div>
                        <div className="text-[10px] font-mono text-gray-400">#F5EFEB</div>
                      </div>
                    </motion.div>

                    {/* Swatch: Brand Umber */}
                    <motion.div
                      whileHover={{ y: -4 }}
                      onClick={() => setSelectedElement("palette-umber")}
                      className={`cursor-pointer rounded-sm overflow-hidden border transition-all ${
                        selectedElement === "palette-umber"
                          ? "border-[#A259FF] ring-2 ring-[#A259FF]/30 scale-[1.02]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="h-28 bg-[#211B12]" />
                      <div className="p-3 bg-[#2A2A2A] text-left space-y-1">
                        <div className="text-[11px] font-bold text-white uppercase tracking-wider">Charcoal Umber</div>
                        <div className="text-[10px] font-mono text-gray-400">#211B12</div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              )}

              {activePage === "typography" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-serif text-2xl text-white mb-2 font-normal">Typography System</h3>
                    <p className="text-xs text-gray-400 font-light max-w-md">
                      Pairing elegant historical display fonts with extremely readable monospace and neutral sans-serif geometries.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Serif Row */}
                    <div
                      onClick={() => setSelectedElement("typo-display")}
                      className={`p-4 rounded-sm border cursor-pointer text-left transition-all ${
                        selectedElement === "typo-display"
                          ? "bg-[#252525] border-[#A259FF]"
                          : "bg-[#202020]/40 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono text-[#0ACF83] uppercase tracking-widest font-semibold bg-[#0ACF83]/10 px-2 py-0.5 rounded">
                          Display Title style
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">Playfair Display Medium</span>
                      </div>
                      <p className="font-serif text-2xl text-brand-linen tracking-wide font-normal">
                        Details Define You
                      </p>
                    </div>

                    {/* Sans Row */}
                    <div
                      onClick={() => setSelectedElement("typo-sans")}
                      className={`p-4 rounded-sm border cursor-pointer text-left transition-all ${
                        selectedElement === "typo-sans"
                          ? "bg-[#252525] border-[#A259FF]"
                          : "bg-[#202020]/40 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[9px] font-mono text-[#0ACF83] uppercase tracking-widest font-semibold bg-[#0ACF83]/10 px-2 py-0.5 rounded">
                          Body regular style
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">Inter Regular (Light 300)</span>
                      </div>
                      <p className="font-sans text-xs text-gray-300 font-light leading-relaxed">
                        Designed for the modern individual who values artisanal quality and sustainable restraint. Made to last generations without losing a molecule of majestic brilliance.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activePage === "components" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="font-serif text-2xl text-white mb-2 font-normal">UI Component Forge</h3>
                    <p className="text-xs text-gray-400 font-light max-w-md">
                      Live interactive rendered components. Feel free to interact with them inside the design sandbox!
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Rendered Master Component preview */}
                    <div
                      onClick={() => setSelectedElement("comp-button")}
                      className={`p-6 rounded-sm border cursor-pointer text-left transition-all ${
                        selectedElement === "comp-button"
                          ? "bg-[#252525] border-[#A259FF]"
                          : "bg-[#202020]/40 border-white/5 hover:border-white/10"
                      }`}
                    >
                      <span className="text-[9px] font-mono text-[#A259FF] uppercase tracking-widest font-semibold bg-[#A259FF]/10 px-2 py-0.5 rounded block w-fit mb-4">
                        Master Component ❖
                      </span>

                      <div className="flex items-center justify-center p-6 bg-[#161616] rounded-sm">
                        <button className="bg-[#6A5C47] text-white font-sans text-xs font-semibold py-4 px-10 uppercase tracking-[0.2em] hover:bg-[#211B12] transition-colors shadow-md rounded-sm">
                          Explore Collection
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activePage === "mockups" && (
                <div className="space-y-6 text-center">
                  <div className="text-left">
                    <h3 className="font-serif text-2xl text-white mb-2 font-normal">Figma Web Mockup Canvas</h3>
                    <p className="text-xs text-gray-400 font-light max-w-md">
                      A visual mockup generated by our creative engine reflecting the authentic layout, borders, and spacing specs.
                    </p>
                  </div>

                  {/* Rendered Mockup image */}
                  <div className="relative aspect-[3/2] bg-[#161616] border border-white/10 overflow-hidden shadow-lg group">
                    <img
                      src="/src/assets/images/vero_figma_mockup_1784082575029.jpg"
                      alt="VERO Figma Landing Mockup"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1500ms]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <a
                        href="/src/assets/images/vero_figma_mockup_1784082575029.jpg"
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white text-brand-umber text-xs uppercase font-semibold tracking-wider px-4 py-2 flex items-center gap-1.5 hover:bg-brand-linen"
                      >
                        <span>View High Resolution</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Artisan Branding Stamp */}
              <div className="pt-6 border-t border-white/5 flex justify-between items-center mt-8">
                <span className="font-serif text-lg tracking-[0.25em] text-brand-gold uppercase">VERO</span>
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Florence &amp; Milan Spec</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Sidebar: Figma Properties Inspector & Code Exporter */}
        <div className="w-80 bg-[#2C2C2C] border-l border-[#3E3E3E] flex flex-col h-full overflow-y-auto font-sans select-text">
          {/* Tabs: Design / Inspect */}
          <div className="flex border-b border-[#3E3E3E] select-none bg-[#242424]">
            <button
              onClick={() => setInspectTab("design")}
              className={`flex-1 py-3 text-xs font-medium tracking-wider uppercase transition-all text-center ${
                inspectTab === "design" ? "text-white border-b-2 border-[#A259FF]" : "text-gray-400 hover:text-white"
              }`}
            >
              Design
            </button>
            <button
              onClick={() => setInspectTab("inspect")}
              className={`flex-1 py-3 text-xs font-medium tracking-wider uppercase transition-all text-center ${
                inspectTab === "inspect" ? "text-white border-b-2 border-[#A259FF]" : "text-gray-400 hover:text-white"
              }`}
            >
              Inspect Code
            </button>
          </div>

          <div className="p-4 space-y-6">
            {/* Element Spec Name Title */}
            <div>
              <span className="text-[9px] font-bold text-[#A259FF] uppercase tracking-widest block mb-1">
                {currentSpec.type}
              </span>
              <h3 className="text-sm font-semibold text-white tracking-wide">{currentSpec.name}</h3>
              <p className="text-[10px] text-gray-500 font-mono mt-1">Dimensions: {currentSpec.dimensions}</p>
            </div>

            {inspectTab === "design" ? (
              <>
                {/* Section: Properties list */}
                <div className="space-y-3.5 pt-4 border-t border-[#3E3E3E]">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    Design Tokens Spec
                  </h4>
                  <div className="space-y-2.5">
                    {currentSpec.properties.map((prop, i) => (
                      <div key={i} className="flex justify-between items-center text-xs border-b border-[#3E3E3E]/30 pb-2">
                        <span className="text-gray-400 font-light">{prop.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-white font-medium">{prop.value}</span>
                          {(prop.label.includes("Hex") || prop.label.includes("Family")) && (
                            <button
                              onClick={() => handleCopy(prop.value, `${prop.label}-${i}`)}
                              className="text-gray-500 hover:text-white transition-colors"
                              title="Copy value"
                            >
                              {copiedText === `${prop.label}-${i}` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Figma Import Helper */}
                <div className="bg-[#1E1E1E] p-3.5 rounded-sm border border-[#3E3E3E] space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand-gold uppercase tracking-widest">
                    <Info className="w-3.5 h-3.5" />
                    <span>Import to Figma</span>
                  </div>
                  <p className="text-[10px] text-gray-400 font-light leading-relaxed">
                    You can easily convert this boutique application into a native, vector-layered Figma file!
                  </p>
                  <ol className="text-[9.5px] text-gray-400 font-light list-decimal list-inside space-y-1 pl-1">
                    <li>Install the free Figma plugin <strong className="text-gray-200 font-semibold">"HTML to Design"</strong></li>
                    <li>Paste our live boutique URL inside the plugin inputs</li>
                    <li>Click <strong className="text-[#A259FF]">Import</strong> to forge beautiful, editable Figma vectors!</li>
                  </ol>
                  <div className="pt-1.5 flex justify-end">
                    <a
                      href="https://www.figma.com/community/plugin/1155947757192255877"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] text-[#A259FF] font-semibold uppercase tracking-wider underline underline-offset-2 flex items-center gap-1"
                    >
                      <span>Figma Plugin Page</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Section: Tailwind Class Code Block */}
                <div className="space-y-2 pt-4 border-t border-[#3E3E3E]">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Tailwind Utility Classes
                    </h4>
                    <button
                      onClick={() => handleCopy(currentSpec.codeTailwind, "tailwind")}
                      className="text-[10.5px] text-[#A259FF] font-semibold hover:underline flex items-center gap-1"
                    >
                      {copiedText === "tailwind" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy CSS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-[#1E1E1E] border border-[#3E3E3E] text-[11px] font-mono text-emerald-400 rounded-sm overflow-x-auto whitespace-pre-wrap select-all">
                    {currentSpec.codeTailwind}
                  </pre>
                </div>

                {/* Section: Native CSS Code Block */}
                <div className="space-y-2 pt-4 border-t border-[#3E3E3E]">
                  <div className="flex justify-between items-center">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      Raw Native CSS Style
                    </h4>
                    <button
                      onClick={() => handleCopy(currentSpec.codeCSS, "css")}
                      className="text-[10.5px] text-[#A259FF] font-semibold hover:underline flex items-center gap-1"
                    >
                      {copiedText === "css" ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy CSS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3 bg-[#1E1E1E] border border-[#3E3E3E] text-[10px] font-mono text-gray-300 rounded-sm overflow-x-auto whitespace-pre select-all">
                    {currentSpec.codeCSS}
                  </pre>
                </div>
              </>
            )}

            {/* Downloader Trigger confirmation alert */}
            <AnimatePresence>
              {exportSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-sm flex items-start gap-2.5"
                >
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                      Download Started!
                    </span>
                    <p className="text-[9.5px] text-gray-300 font-light leading-snug">
                      Your VERO Design System JSON specs file has been exported beautifully. Ready to import to any Figma design system token runner.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
