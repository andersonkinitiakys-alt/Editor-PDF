import { Link } from "react-router-dom";
import { 
  Combine, 
  SplitSquareHorizontal, 
  RotateCw, 
  Droplets, 
  Hash,
  FileText,
  Lock,
  Unlock,
  Settings,
  Edit3,
  PenTool,
  Globe,
  Archive,
  Scan,
  ScanText,
  Columns,
  EyeOff,
  Crop,
  Languages
} from "lucide-react";

const tools = [
  {
    id: "merge",
    name: "Juntar PDF",
    description: "Junte PDFs e coloque-os na ordem que preferir. Rápido e fácil.",
    icon: Combine,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    id: "split",
    name: "Dividir PDF",
    description: "Separe uma página ou um conjunto de páginas para converter em arquivos PDF independentes.",
    icon: SplitSquareHorizontal,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    id: "rotate",
    name: "Rodar PDF",
    description: "Rode os seus PDFs da forma que precisar. Pode rodar vários PDFs ao mesmo tempo!",
    icon: RotateCw,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "watermark",
    name: "Marca d'água",
    description: "Escolha uma imagem ou texto para inserir no seu PDF. Selecione a posição, transparência e tipografia.",
    icon: Droplets,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    id: "page-numbers",
    name: "Números de página",
    description: "Adicione números de página em PDFs com facilidade. Escolha a posição, dimensões e tipografia.",
    icon: Hash,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    id: "compress",
    name: "Comprimir PDF",
    description: "Diminua o tamanho do seu arquivo PDF, mantendo a melhor qualidade possível.",
    icon: Settings,
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
  },
  {
    id: "edit",
    name: "Editar PDF",
    description: "Adicione texto, imagens, formas ou anotações à mão em um documento PDF.",
    icon: Edit3,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    id: "sign-pdf",
    name: "Assinar PDF",
    description: "Assine você mesmo ou solicite assinaturas eletrônicas de outras pessoas.",
    icon: PenTool,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    id: "html-to-pdf",
    name: "HTML para PDF",
    description: "Converta páginas da web em documentos PDF. Cole a URL ou o código HTML.",
    icon: Globe,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  {
    id: "pdf-to-pdfa",
    name: "PDF para PDF/A",
    description: "Converta PDF para PDF/A para arquivamento a longo prazo.",
    icon: Archive,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: "scan-to-pdf",
    name: "Digitalizar para PDF",
    description: "Use sua câmera para digitalizar documentos e transformá-los em PDF.",
    icon: Scan,
    color: "text-teal-500",
    bgColor: "bg-teal-50",
  },
  {
    id: "ocr-pdf",
    name: "OCR PDF",
    description: "Transforme PDFs digitalizados em texto pesquisável e selecionável.",
    icon: ScanText,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
  {
    id: "compare-pdf",
    name: "Comparar PDF",
    description: "Compare dois documentos PDF lado a lado para encontrar diferenças.",
    icon: Columns,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    id: "redact-pdf",
    name: "Ocultar PDF",
    description: "Remova informações confidenciais ou dados sensíveis do seu PDF.",
    icon: EyeOff,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
  {
    id: "crop-pdf",
    name: "Recortar PDF",
    description: "Recorte as margens das páginas do PDF para unificar o tamanho.",
    icon: Crop,
    color: "text-orange-500",
    bgColor: "bg-orange-50",
  },
  {
    id: "translate-pdf",
    name: "Traduzir PDF",
    description: "Traduza o texto do seu PDF para outro idioma instantaneamente.",
    icon: Languages,
    color: "text-cyan-500",
    bgColor: "bg-cyan-50",
  },
  {
    id: "organize",
    name: "Organizar PDF",
    description: "Ordene páginas do seu PDF como quiser. Apague páginas ou adicione páginas de outros PDFs.",
    icon: Settings,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    id: "protect",
    name: "Proteger PDF",
    description: "Proteja arquivos PDF com senha. Criptografe documentos PDF para impedir acesso não autorizado.",
    icon: Lock,
    color: "text-indigo-500",
    bgColor: "bg-indigo-50",
  },
  {
    id: "unlock",
    name: "Desbloquear PDF",
    description: "Remova a senha de segurança de PDFs para poder usá-los como quiser.",
    icon: Unlock,
    color: "text-pink-500",
    bgColor: "bg-pink-50",
  },
  {
    id: "pdf-to-jpg",
    name: "PDF para JPG",
    description: "Extraia todas as imagens contidas em um PDF ou converta cada página em um arquivo JPG.",
    icon: FileText,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "jpg-to-pdf",
    name: "JPG para PDF",
    description: "Converta imagens JPG para PDF em segundos. Ajuste a orientação e as margens facilmente.",
    icon: FileText,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    id: "repair",
    name: "Reparar PDF",
    description: "Conserte um PDF danificado e recupere dados de arquivos corrompidos.",
    icon: Settings,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
  },
  {
    id: "pdf-to-word",
    name: "PDF para Word",
    description: "Converta facilmente seus arquivos PDF em documentos DOCX fáceis de editar.",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "pdf-to-powerpoint",
    name: "PDF para PowerPoint",
    description: "Transforme seus PDFs em apresentações PPTX fáceis de editar.",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "pdf-to-excel",
    name: "PDF para Excel",
    description: "Extraia dados diretamente de PDFs para planilhas Excel em poucos segundos.",
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: "word-to-pdf",
    name: "Word para PDF",
    description: "Converta seus documentos WORD para PDF com a máxima qualidade.",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: "powerpoint-to-pdf",
    name: "PowerPoint para PDF",
    description: "Converta suas apresentações PPTX para PDF com a máxima qualidade.",
    icon: FileText,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    id: "excel-to-pdf",
    name: "Excel para PDF",
    description: "Converta suas planilhas XLSX para PDF com a máxima qualidade.",
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
];

export function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          Toda ferramenta que você precisa para usar PDFs, na ponta dos seus dedos.
        </h1>
        <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
          Todas as ferramentas são 100% GRATUITAS e fáceis de usar! Junte, divida, comprima e converta PDFs com apenas alguns cliques.
        </p>
      </div>

      <div className="max-w-7xl mx-auto grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tools.map((tool) => (
          <Link
            key={tool.id}
            to={`/${tool.id}`}
            className={`relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-emerald-500 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 flex flex-col items-start`}
          >
            <div className={`p-3 rounded-lg ${tool.bgColor} ${tool.color} mb-4`}>
              <tool.icon className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {tool.name}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-3">
              {tool.description}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
