import { describe, it, expect } from 'vitest';
import { extractPRDData } from '../prdExtractor';

describe('extractPRDData', () => {
  it('deve extrair título do campo "Descrição concisa"', () => {
    const prd = `Descrição Concisa: Sistema de Gestão de Tarefas\n\nMais conteúdo...`;
    const result = extractPRDData(prd);
    expect(result.title).toBe('Sistema de Gestão de Tarefas');
  });

  it('deve extrair título do campo "Nome do Produto"', () => {
    const prd = `Nome do Produto: App de Delivery\n\nOutro conteúdo...`;
    const result = extractPRDData(prd);
    expect(result.title).toBe('App de Delivery');
  });

  it('deve usar primeira linha como fallback', () => {
    const prd = 'Este é um documento sobre gestão de projetos. Mais conteúdo aqui.';
    const result = extractPRDData(prd);
    expect(result.title).toContain('documento sobre gestão de projetos');
  });

  it('deve usar "Sem título" como fallback final', () => {
    const prd = '#';
    const result = extractPRDData(prd);
    expect(result.title).toBe('Sem título');
  });

  it('deve limitar título a 60 caracteres', () => {
    const longTitle = 'a'.repeat(100);
    const prd = `Descrição Concisa: ${longTitle}`;
    const result = extractPRDData(prd);
    expect(result.title.length).toBeLessThanOrEqual(60);
  });

  it('deve extrair seção "Problema"', () => {
    const prd = `## Problema\n\nUsuários precisam gerenciar tarefas.\n\n## Solução`;
    const result = extractPRDData(prd);
    expect(result.sections.problema).toContain('Usuários precisam gerenciar tarefas');
  });

  it('deve extrair seção "Solução"', () => {
    const prd = `## Solução\n\nCriar um app web.\n\n## Funcionalidades`;
    const result = extractPRDData(prd);
    expect(result.sections.solucao).toContain('Criar um app web');
  });

  it('deve extrair seção "Funcionalidades"', () => {
    const prd = `## Funcionalidades\n\n1. Criar tarefas\n2. Editar tarefas`;
    const result = extractPRDData(prd);
    expect(result.sections.funcionalidades).toContain('Criar tarefas');
  });

  it('deve retornar seções vazias quando não encontradas', () => {
    const prd = 'Documento sem seções estruturadas';
    const result = extractPRDData(prd);
    expect(result.sections.problema).toBe('');
    expect(result.sections.solucao).toBe('');
    expect(result.sections.funcionalidades).toBe('');
  });

  it('deve detectar tags automaticamente', () => {
    const prd = 'Sistema com React, Node.js, PostgreSQL e API REST para pagamento com Stripe';
    const result = extractPRDData(prd);
    expect(result.tags.length).toBeGreaterThan(0);
    expect(result.tags.length).toBeLessThanOrEqual(3);
  });

  it('deve detectar tags de IA', () => {
    const prd = 'Chatbot com inteligência artificial e machine learning';
    const result = extractPRDData(prd);
    expect(result.tags).toContain('ai');
  });

  it('deve detectar tags de e-commerce', () => {
    const prd = 'Loja online com carrinho de compras e marketplace';
    const result = extractPRDData(prd);
    expect(result.tags).toContain('ecommerce');
  });

  it('deve detectar tags de automação', () => {
    const prd = 'Sistema de automação com workflow e integração Zapier';
    const result = extractPRDData(prd);
    expect(result.tags).toContain('automation');
  });

  it('deve calcular complexidade entre 1 e 5', () => {
    const prd = 'Sistema simples com uma funcionalidade básica';
    const result = extractPRDData(prd);
    expect(result.complexity).toBeGreaterThanOrEqual(1);
    expect(result.complexity).toBeLessThanOrEqual(5);
  });

  it('deve aumentar complexidade para sistemas com muitas features', () => {
    const simplePrd = 'App simples de notas';
    const complexPrd = `
      Sistema complexo com múltiplas funcionalidades:
      - Feature 1, Feature 2, Feature 3, Feature 4, Feature 5
      - Requisito A, Requisito B, Requisito C, Requisito D
      - Funcionalidade X, Funcionalidade Y, Funcionalidade Z
      - API externa, integração webhook, microservices
      - Machine learning, realtime, blockchain
    `;
    
    const simpleResult = extractPRDData(simplePrd);
    const complexResult = extractPRDData(complexPrd);
    
    expect(complexResult.complexity).toBeGreaterThan(simpleResult.complexity);
  });

  it('deve priorizar tags específicas sobre genéricas', () => {
    const prd = 'App mobile com pagamento e analytics';
    const result = extractPRDData(prd);
    
    // Deve ter tags específicas (payment, analytics) mesmo tendo "mobile"
    expect(result.tags).toContain('payment');
    expect(result.tags).toContain('analytics');
  });

  it('deve limitar a 3 tags', () => {
    const prd = 'Sistema com IA, automação, pagamento, analytics, CRM, realtime e ecommerce';
    const result = extractPRDData(prd);
    expect(result.tags.length).toBeLessThanOrEqual(3);
  });
});
