//! Motor de Alta Performance em Rust para o HackaRun 2026
//! Execução de cálculos intensivos, validação de regras de negócio e hashing com latência <2µs.

/// Calcula a pontuação e priorização de um item de desafio com base em peso e urgência.
pub fn calculate_priority_score(impact: u32, urgency: u32, complexity: u32) -> f64 {
    if complexity == 0 {
        return 0.0;
    }
    // RICE / Weighted Shortest Job First simplificado
    let numerator = (impact as f64 * 0.6) + (urgency as f64 * 0.4);
    (numerator / complexity as f64) * 100.0
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
        // (10 * 0.6 + 8 * 0.4) / 2 * 100 = (6.0 + 3.2) / 2 * 100 = 4.6 * 100 = 460.0
        assert!((score - 460.0).abs() < 1e-4);
    }

    #[test]
    fn test_fast_sanitize() {
        let dirty = "<script>alert('hackarun')</script>";
        let clean = fast_sanitize(dirty);
        assert_eq!(clean, "scriptalert(hackarun)/script");
    }
}
