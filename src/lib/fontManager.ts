import { FONT_REGISTRY, FontMetadata } from './fontRegistry';

class FontManager {
  private loadedFonts: Set<string> = new Set();
  private loadingFonts: Map<string, Promise<void>> = new Map();

  /**
   * Loads a font family with optional weight and style.
   * Uses Google Fonts API as the source for the 200+ library.
   */
  async loadFont(family: string, weight: string = '400', italic: boolean = false): Promise<void> {
    const fontId = `${family}:${weight}${italic ? 'i' : ''}`;
    
    if (this.loadedFonts.has(fontId)) return;
    if (this.loadingFonts.has(fontId)) return this.loadingFonts.get(fontId)!;

    const promise = (async () => {
      try {
        // Find metadata in registry to ensure it's a valid font
        const metadata = FONT_REGISTRY.find(f => f.family === family);
        
        // Mappings for Standard fonts to Google Fonts if system doesn't have them
        const standardMappings: Record<string, string> = {
          'Arial': 'Arimo',
          'Times New Roman': 'Tinos',
          'Courier New': 'Cousine',
          'Garamond': 'EB Garamond',
          'Verdana': 'Arimo', // Close enough
          'Georgia': 'Tinos'
        };

        const loadFamily = standardMappings[family] || family;

        // Fallback to standard fonts if not in registry
        if (!metadata && !['Helvetica', 'Times-Roman', 'Courier', 'Symbol', 'ZapfDingbats'].includes(family)) {
           console.warn(`Font ${family} not found in registry. Using fallback.`);
           return;
        }

        const fontStyle = italic ? 'italic' : 'normal';
        const formattedFamily = loadFamily.replace(/\s+/g, '+');
        const url = `https://fonts.googleapis.com/css?family=${formattedFamily}:${weight}${italic ? 'i' : ''}&display=swap`;

        // Load via CSS injection for browser rendering
        if (!document.getElementById(`font-${fontId}`)) {
          const link = document.createElement('link');
          link.id = `font-${fontId}`;
          link.rel = 'stylesheet';
          link.href = url;
          document.head.appendChild(link);
        }

        // Wait for FontFace API to confirm loading
        await document.fonts.load(`${weight} 1em "${family}"`);
        this.loadedFonts.add(fontId);
        console.log(`Successfully loaded font: ${fontId}`);
      } catch (error) {
        console.error(`Error loading font ${fontId}:`, error);
        throw error;
      } finally {
        this.loadingFonts.delete(fontId);
      }
    })();

    this.loadingFonts.set(fontId, promise);
    return promise;
  }

  /**
   * Checks if a font is already loaded.
   */
  isLoaded(family: string, weight: string = '400', italic: boolean = false): boolean {
    return this.loadedFonts.has(`${family}:${weight}${italic ? 'i' : ''}`) || 
           ['Helvetica', 'Times-Roman', 'Courier', 'Symbol', 'ZapfDingbats'].includes(family);
  }

  /**
   * Returns a fallback font family based on category.
   */
  getFallback(originalFamily: string): string {
    const metadata = FONT_REGISTRY.find(f => f.family === originalFamily);
    if (!metadata) return 'sans-serif';

    switch (metadata.category) {
      case 'Serif': return 'serif';
      case 'Monospace': return 'monospace';
      case 'Handwriting':
      case 'Display': return 'cursive';
      default: return 'sans-serif';
    }
  }

  /**
   * Preloads common core fonts for performance.
   */
  async preloadCoreFonts(): Promise<void> {
    const core = ['Roboto', 'Inter', 'Open Sans'];
    await Promise.all(core.map(f => this.loadFont(f)));
  }
}

export const fontManager = new FontManager();
export default fontManager;
