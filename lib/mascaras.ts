// lib/mascaras.ts

// Aplica a máscara 000.000.000-00 conforme o usuário digita,
// aceitando apenas números como entrada.
export function maskCPF(valorAtual: string, novoValor: string): string {
  const apenasDigitos = novoValor.replace(/\D/g, "").slice(0, 11);
  const partes = [];
  if (apenasDigitos.length > 0) partes.push(apenasDigitos.slice(0, 3));
  if (apenasDigitos.length > 3) partes.push(apenasDigitos.slice(3, 6));
  if (apenasDigitos.length > 6) partes.push(apenasDigitos.slice(6, 9));
  let resultado = partes.join(".");
  if (apenasDigitos.length > 9) resultado += "-" + apenasDigitos.slice(9, 11);
  return resultado;
}

// Aplica a máscara 00/00/0000 conforme o usuário digita.
export function maskData(valorAtual: string, novoValor: string): string {
  const apenasDigitos = novoValor.replace(/\D/g, "").slice(0, 8);
  const partes = [];
  if (apenasDigitos.length > 0) partes.push(apenasDigitos.slice(0, 2));
  if (apenasDigitos.length > 2) partes.push(apenasDigitos.slice(2, 4));
  if (apenasDigitos.length > 4) partes.push(apenasDigitos.slice(4, 8));
  return partes.join("/");
}

// Aplica máscara de PIN só-números, sem separadores, limitado a N dígitos.
export function maskPin(novoValor: string, tamanho = 6): string {
  return novoValor.replace(/\D/g, "").slice(0, tamanho);
}

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

// Extrai o primeiro nome de um nome completo e capitaliza só a
// primeira letra (ex: "ALEX COSTA PEREIRA" -> "Alex")
export function primeiroNomeCapitalizado(nomeCompleto: string): string {
  if (!nomeCompleto) return "";
  const primeiro = nomeCompleto.trim().split(/\s+/)[0].toLowerCase();
  return primeiro.charAt(0).toUpperCase() + primeiro.slice(1);
}

// Converte "DD/MM/AAAA" em "AAAA-MM-DD" (formato de data do Postgres/JS)
export function dataParaISO(dataBR: string): string | null {
  const digitos = somenteDigitos(dataBR);
  if (digitos.length !== 8) return null;
  const dia = digitos.slice(0, 2);
  const mes = digitos.slice(2, 4);
  const ano = digitos.slice(4, 8);
  return `${ano}-${mes}-${dia}`;
}
