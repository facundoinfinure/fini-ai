import OpenAI from 'openai';

/**
 * 🤖 Conversation Title Service
 * Auto-genera títulos para conversaciones usando OpenAI GPT
 * Similar a ChatGPT, Claude, etc.
 */
export class ConversationTitleService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });
    }
  }

  /**
   * 🎯 Genera título automático basado en mensajes de conversación
   */
  async generateTitle(messages: Array<{ body: string; direction: 'inbound' | 'outbound' }>): Promise<string> {
    // Fallback si no hay OpenAI configurado
    if (!this.openai) {
      console.warn('[TITLE-SERVICE] OpenAI not configured, using fallback title generation');
      return this.generateFallbackTitle(messages);
    }

    try {
      // Preparar contexto para OpenAI
      const conversationContext = this.prepareConversationContext(messages);
      
      if (conversationContext.trim().length === 0) {
        return 'Nueva conversación';
      }

      // Prompt optimizado para generar títulos concisos y relevantes
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Eres un asistente que genera títulos concisos para conversaciones de e-commerce.
            
REGLAS:
- Máximo 6 palabras
- En español
- Descriptivo del tema principal
- Sin comillas
- Sin prefijos como "Consulta sobre" o "Pregunta de"
- Enfócate en el contenido específico (productos, órdenes, problemas, etc.)

EJEMPLOS:
- "Estado de mi pedido"
- "Cambio de talla producto"
- "Métodos de pago disponibles"
- "Horarios de entrega"
- "Devolución de compra"`
          },
          {
            role: 'user',
            content: `Genera un título para esta conversación de e-commerce:\n\n${conversationContext}`
          }
        ],
        max_tokens: 20,
        temperature: 0.3,
      });

      const generatedTitle = completion.choices[0]?.message?.content?.trim();
      
      if (!generatedTitle) {
        console.warn('[TITLE-SERVICE] OpenAI returned empty title, using fallback');
        return this.generateFallbackTitle(messages);
      }

      // Validar y limpiar el título
      const cleanTitle = this.cleanTitle(generatedTitle);
      
      console.log(`[TITLE-SERVICE] Generated title: "${cleanTitle}"`);
      return cleanTitle;

    } catch (error) {
      console.error('[TITLE-SERVICE] Error generating title with OpenAI:', error);
      return this.generateFallbackTitle(messages);
    }
  }

  /**
   * 📝 Prepara el contexto de la conversación para OpenAI
   */
  private prepareConversationContext(messages: Array<{ body: string; direction: 'inbound' | 'outbound' }>): string {
    // Tomar solo los primeros 3-4 mensajes para determinar el tema
    const relevantMessages = messages.slice(0, 4);
    
    return relevantMessages
      .map(msg => {
        const sender = msg.direction === 'inbound' ? 'Cliente' : 'Asistente';
        return `${sender}: ${msg.body}`;
      })
      .join('\n');
  }

  /**
   * 🛡️ Limpia y valida el título generado
   */
  private cleanTitle(title: string): string {
    let cleaned = title.trim();
    
    // Remover comillas si las tiene
    cleaned = cleaned.replace(/^["']|["']$/g, '');
    
    // Capitalizar primera letra
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Truncar si es muy largo (máximo 50 chars)
    if (cleaned.length > 50) {
      cleaned = cleaned.substring(0, 47) + '...';
    }
    
    // Si está vacío, usar fallback
    if (!cleaned || cleaned.length < 3) {
      return 'Nueva conversación';
    }
    
    return cleaned;
  }

  /**
   * 🔄 Genera título fallback cuando OpenAI no está disponible
   */
  private generateFallbackTitle(messages: Array<{ body: string; direction: 'inbound' | 'outbound' }>): string {
    if (messages.length === 0) {
      return 'Nueva conversación';
    }

    // Buscar palabras clave en los primeros mensajes
    const firstUserMessage = messages.find(m => m.direction === 'inbound')?.body?.toLowerCase() || '';
    
    // Patrones comunes para generar títulos
    const patterns = [
      { keywords: ['pedido', 'orden', 'compra'], title: 'Consulta sobre pedido' },
      { keywords: ['producto', 'articulo', 'item'], title: 'Consulta sobre producto' },
      { keywords: ['envio', 'entrega', 'delivery'], title: 'Consulta sobre envío' },
      { keywords: ['pago', 'factura', 'cobro'], title: 'Consulta sobre pago' },
      { keywords: ['devolucion', 'cambio', 'reembolso'], title: 'Solicitud de devolución' },
      { keywords: ['descuento', 'promocion', 'oferta'], title: 'Consulta sobre promociones' },
      { keywords: ['stock', 'disponibilidad'], title: 'Consulta de disponibilidad' },
      { keywords: ['ayuda', 'problema', 'error'], title: 'Solicitud de ayuda' },
      { keywords: ['cuenta', 'usuario', 'login'], title: 'Consulta sobre cuenta' },
    ];

    // Buscar patrón que coincida
    for (const pattern of patterns) {
      if (pattern.keywords.some(keyword => firstUserMessage.includes(keyword))) {
        return pattern.title;
      }
    }

    // Si no coincide ningún patrón, usar las primeras palabras del mensaje
    const words = firstUserMessage.split(' ').slice(0, 4).join(' ');
    if (words.length > 3) {
      return this.cleanTitle(words);
    }

    return 'Nueva conversación';
  }

  /**
   * 🔄 Actualiza el título de una conversación si no tiene uno
   */
  async updateConversationTitle(conversationId: string, messages: Array<{ body: string; direction: 'inbound' | 'outbound' }>): Promise<string | null> {
    if (messages.length === 0) {
      return null;
    }

    try {
      const title = await this.generateTitle(messages);
      
      // Aquí podrías hacer la llamada a la API para actualizar el título
      // o devolver el título para que lo haga el caller
      return title;
      
    } catch (error) {
      console.error('[TITLE-SERVICE] Error updating conversation title:', error);
      return null;
    }
  }
}

// Instancia singleton
export const conversationTitleService = new ConversationTitleService(); 