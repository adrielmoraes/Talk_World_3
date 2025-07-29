import React, { useState, useEffect } from 'react';
import { ExternalLink, FileText, Video, Image } from 'lucide-react';
import { cn } from '../lib/utils';

interface LinkPreviewData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  type?: 'website' | 'image' | 'video' | 'document';
}

interface LinkPreviewProps {
  url: string;
  className?: string;
}

export function LinkPreview({ url, className }: LinkPreviewProps) {
  const [previewData, setPreviewData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setLoading(true);
        setError(false);
        
        // Simular busca de preview (em produção, isso seria uma API real)
        // Por enquanto, vamos extrair informações básicas da URL
        const urlObj = new URL(url);
        const domain = urlObj.hostname;
        
        // Detectar tipo baseado na extensão ou domínio
        let type: LinkPreviewData['type'] = 'website';
        const pathname = urlObj.pathname.toLowerCase();
        
        if (pathname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          type = 'image';
        } else if (pathname.match(/\.(mp4|avi|mov|wmv|flv|webm)$/)) {
          type = 'video';
        } else if (pathname.match(/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/)) {
          type = 'document';
        }
        
        // Simular dados de preview
        const mockPreview: LinkPreviewData = {
          url,
          title: type === 'website' ? `Página em ${domain}` : pathname.split('/').pop() || 'Arquivo',
          description: type === 'website' ? `Conteúdo de ${domain}` : `Arquivo ${type}`,
          siteName: domain,
          type
        };
        
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 500));
        
        setPreviewData(mockPreview);
      } catch (err) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [url]);

  const handleClick = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className={cn("border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-2 animate-pulse", className)}>
        <div className="flex space-x-3">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !previewData) {
    return (
      <div className={cn("border border-gray-200 dark:border-gray-700 rounded-lg p-3 mt-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800", className)}
           onClick={handleClick}>
        <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
          <ExternalLink className="h-4 w-4" />
          <span className="text-sm truncate">{url}</span>
        </div>
      </div>
    );
  }

  const getTypeIcon = () => {
    switch (previewData.type) {
      case 'image':
        return <Image className="h-5 w-5" />;
      case 'video':
        return <Video className="h-5 w-5" />;
      case 'document':
        return <FileText className="h-5 w-5" />;
      default:
        return <ExternalLink className="h-4 w-4" />;
    }
  };

  return (
    <div 
      className={cn(
        "border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden mt-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
        className
      )}
      onClick={handleClick}
    >
      <div className="p-3">
        <div className="flex space-x-3">
          {/* Icon/Thumbnail */}
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
            {previewData.image ? (
              <img 
                src={previewData.image} 
                alt="Preview" 
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="text-gray-400 dark:text-gray-500">
                {getTypeIcon()}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {previewData.title}
            </h4>
            
            {previewData.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                {previewData.description}
              </p>
            )}
            
            <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-500">
              {getTypeIcon()}
              <span className="ml-1 truncate">{previewData.siteName}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}