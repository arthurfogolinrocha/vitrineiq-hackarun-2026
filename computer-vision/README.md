# computer-vision

Visão computacional da vitrine do VitrineIQ.

O script da câmera conta quem passa e quem olha a vitrine e envia **só contagens anônimas** para a API: `POST /vitrine/eventos` e `POST /vitrine/alertas`. O painel lê o resumo em `GET /vitrine/resumo` (T3, issue #29).

Nenhuma imagem sai do aparelho e nenhuma é guardada.

> Pasta criada na reorganização do repositório. O código da câmera (`vitrine_camera`) ainda vai ser trazido para cá.
