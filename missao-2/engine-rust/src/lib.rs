//! Motor de Alta Performance em Rust para o VitrineIQ — HackaRun 2026
//! Execução de cálculos de prioridade, score de oportunidade comercial e sanitização com latência <2µs.

/// Calcula a pontuação e priorização de um item de desafio com base em peso e urgência.
pub fn calculate_priority_score(impact: u32, urgency: u32, complexity: u32) -> f64 {
    if complexity == 0 {
        return 0.0;
    }
    let numerator = (impact as f64 * 0.6) + (urgency as f64 * 0.4);
    (numerator / complexity as f64) * 100.0
}

/// Calcula o Score de Oportunidade Comercial do VitrineIQ (0 a 100)
/// cruzando fluxo na vitrine, sinais do Concierge QR, vendas perdidas e fator contextual.
pub fn calculate_retail_opportunity_score(
    vitrine_stops: u32,
    qr_searches: u32,
    lost_sales: u32,
    context_multiplier: f64,
) -> f64 {
    let raw_demand = (vitrine_stops as f64 * 0.15)
        + (qr_searches as f64 * 2.4)
        + (lost_sales as f64 * 3.8);
    let weighted = raw_demand * context_multiplier.clamp(0.5, 2.0);
    weighted.clamp(0.0, 100.0)
}

/// Sanitiza strings contra caracteres de injeção direta no nível de memória.
pub fn fast_sanitize(input: &str) -> String {
    input
        .chars()
        .filter(|&c| c != '<' && c != '>' && c != '"' && c != '\'')
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calculate_priority_score() {
        let score = calculate_priority_score(10, 8, 2);
        assert!((score - 460.0).abs() < 1e-4);
    }

    #[test]
    fn test_retail_opportunity_score_bounds() {
        let low = calculate_retail_opportunity_score(10, 2, 1, 1.0);
        assert!(low > 0.0 && low < 100.0);

        let capped = calculate_retail_opportunity_score(1000, 100, 50, 2.0);
        assert!((capped - 100.0).abs() < 1e-4);
    }

    #[test]
    fn test_fast_sanitize() {
        let dirty = "<script>alert('hackarun')</script>";
        let clean = fast_sanitize(dirty);
        assert_eq!(clean, "scriptalert(hackarun)/script");
    }
}
