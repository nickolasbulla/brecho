// Gera UUID v4 sem depender de crypto (compatível com todos os ambientes Expo)
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function formatPrice(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atrás`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d atrás`;
  return new Date(dateStr).toLocaleDateString('pt-BR');
}

export function conditionColor(condition: string): string {
  switch (condition) {
    case 'Novo': return '#22C55E';
    case 'Seminovo': return '#3B82F6';
    case 'Usado': return '#F59E0B';
    case 'Muito usado': return '#EF4444';
    default: return '#94A3B8';
  }
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

// Formata número de telefone para o padrão internacional do WhatsApp (55 + DDD + número)
export function formatPhoneForWhatsApp(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  // Já tem DDI 55 → usa como está
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  // Sem DDI → adiciona 55 (Brasil)
  return `55${digits}`;
}

// Monta URL do WhatsApp com mensagem pré-preenchida
export function whatsAppUrl(phone: string, productTitle: string): string {
  const number = formatPhoneForWhatsApp(phone);
  const text = encodeURIComponent(
    `Olá! Vi seu anúncio "${productTitle}" no Brechó e tenho interesse. Ainda está disponível?`
  );
  return `https://wa.me/${number}?text=${text}`;
}
