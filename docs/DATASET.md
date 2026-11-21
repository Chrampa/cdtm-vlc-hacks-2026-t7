# Dataset Facts — NTT DATA Synthetic Profiles (`data/profiles.parquet`)

Verified against the 190,000-row parquet file (`~30 MB`, git-ignored at `data/profiles.parquet`).
Download note: the SharePoint link in `docs/case/NTT DATA- Case Data and Resources.pdf` downloads directly when `&download=1` is appended (requires a `User-Agent` header when fetched with Python `urllib` or Cloudflare returns error 1010). The PDF of three official test briefs was not included in the share link; `matcher/examples.py` holds our reconstructions of them.

## Closed vocabularies

| Field | Unique values | Notes |
|---|---|---|
| Profiles | 190,000 | Spanish field names (`rol`, `area`, `nivel_seniority`, `disponibilidad`, `sector_principal`, `pais`, `skills`, `proyectos`, `experiencia`, `certificaciones`, `idiomas`, `habilidades_blandas`, `metodologias`, `resumen`) |
| Skills | 614 | Every role draws from a fixed pool of 8–13 skills; 506 skills belong to exactly one role |
| Roles (`rol`) | 87 | Grouped into 12 `area` departments |
| Certifications | 100 | Directly mapped in `matcher/data.py` |
| Sectors | 10 | Evidenced via `sector_principal`, `proyectos[].cliente_sector`, and `experiencia[].empresa` (`vocab.EMPLOYER_SECTOR`) |
| Languages | 15 | CEFR + `Nativo` (`A1 < A2 < B1 < B2 < C1 < C2 < Nativo`); `Catalán` and `Valenciano` are treated as equivalents |
| Countries | 15 present (20 mapped) | Spain (104,427), Mexico (12,038), Brazil (10,094), India (9,996), US (8,236), Italy (7,848), UK (6,062), Germany (6,046), Poland (4,125), Argentina (4,064), Japan (4,063), Colombia (3,939), Portugal (3,063), Romania (3,009), Chile (2,990) |
| Employers | 39 | 14 client-sector employers mapped in `vocab.EMPLOYER_SECTOR` |

## Key structural findings (drive the matching & team-forming design)

1. **Synonyms live in different departments:** e.g. `RGPD` vs `GDPR`, `Accesibilidad` vs `Accesibilidad web`, `AKS` / `EKS` / `GKE` vs `Kubernetes`, `Catalán` vs `Valenciano`. Literal keyword search misses strong internal candidates.
2. **Hidden cross-department talent:** No `Data Engineer` lists any `Google Cloud` skill directly — GCP evidence sits with `Analytics Engineer` (`BigQuery`) and `Cloud Engineer (GCP)` (`Google Cloud`, `GKE`, `Cloud Run`).
3. **Templated text & noisy soft fields:** `resumen` is 100% templated. `habilidades_blandas` (soft skills) and `metodologias` are uniformly random across the dataset, so they carry weak signal (`SOFT_FACTOR = 0.5`).
4. **Availability distribution:** ~82% `Asignado` (code 2), ~9.9% `Roll-off próximo (<3 meses)` (code 1), ~8% `En banca` (code 0).
5. **Seniority distribution & zero-junior roles:**
   - Overall: Mid (61,202), Senior (48,782), Junior (31,085), Lead (28,622), Principal (18,926), Trainee (1,383).
   - Several roles have **zero Juniors/Trainees** in the dataset, including `Cloud Architect` (Senior+ only), `Mainframe Developer (COBOL)` (Mid+ only), `Project Manager` (Mid+ only), `Software Architect`, `Data Architect`, `Security Architect`, `Delivery Manager`, `Program Manager`.
   - Key banking-migration role areas: `Cloud Architect` (`Cloud & Infraestructura`), `Mainframe Developer (COBOL)` (`Software Engineering`), `Data Engineer` (`Data & AI`), `Project Manager` (`Gestión y Delivery`). Because `Data Engineer` is the only `Data & AI` slot on that 5-person team, a junior Data Engineer has no Senior+ mentor in `Data & AI`.
