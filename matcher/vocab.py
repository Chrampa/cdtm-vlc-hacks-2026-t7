"""Static domain knowledge: orderings, display names and small hand-made maps.

Everything here is either an ordering defined by the data documentation (availability,
seniority, CEFR) or a transparent, reviewable mapping (employer -> sector). Nothing is
learned or guessed at runtime.
"""

from __future__ import annotations

AVAILABILITY = ["En banca", "Roll-off próximo (<3 meses)", "Asignado"]
AVAILABILITY_LABEL = {
    0: "Available now",
    1: "Free in < 3 months",
    2: "Assigned",
}
# Hard-filter levels: which availability codes pass.
AVAILABILITY_FILTER = {
    "now": {0},
    "soon": {0, 1},
    "any": {0, 1, 2},
}

SENIORITY = ["Trainee", "Junior", "Mid", "Senior", "Lead", "Principal"]

# CEFR-like ordering used by the dataset ("Nativo" = native).
LANG_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"]
LANG_LEVEL_RANK = {lvl: i + 1 for i, lvl in enumerate(LANG_LEVELS)}

# Languages that are the same language for staffing purposes.
LANGUAGE_EQUIVALENTS = {
    "Catalán": {"Catalán", "Valenciano"},
    "Valenciano": {"Catalán", "Valenciano"},
}

LANGUAGE_EN = {
    "Inglés": "English",
    "Español": "Spanish",
    "Portugués": "Portuguese",
    "Catalán": "Catalan",
    "Valenciano": "Valencian",
    "Italiano": "Italian",
    "Alemán": "German",
    "Hindi": "Hindi",
    "Japonés": "Japanese",
    "Chino mandarín": "Mandarin Chinese",
    "Francés": "French",
    "Polaco": "Polish",
    "Gallego": "Galician",
    "Rumano": "Romanian",
    "Euskera": "Basque",
}

SECTOR_EN = {
    "Banca y Finanzas": "Banking & Finance",
    "Sector Público": "Public Sector",
    "Telecomunicaciones y Media": "Telecom & Media",
    "Industria y Automoción": "Industry & Automotive",
    "Retail y Consumo": "Retail & Consumer",
    "Seguros": "Insurance",
    "Energía y Utilities": "Energy & Utilities",
    "Sanidad y Farma": "Healthcare & Pharma",
    "Transporte y Logística": "Transport & Logistics",
    "Turismo y Ocio": "Travel & Leisure",
}

COUNTRY_EN = {
    "España": "Spain",
    "México": "Mexico",
    "Brasil": "Brazil",
    "India": "India",
    "Estados Unidos": "United States",
    "Italia": "Italy",
    "Reino Unido": "United Kingdom",
    "Alemania": "Germany",
    "Polonia": "Poland",
    "Argentina": "Argentina",
    "Japón": "Japan",
    "Colombia": "Colombia",
    "Portugal": "Portugal",
    "Rumanía": "Romania",
    "Chile": "Chile",
    "Francia": "France",
    "Perú": "Peru",
    "Marruecos": "Morocco",
    "Bélgica": "Belgium",
    "Países Bajos": "Netherlands",
}

# Employers whose name itself tells the client sector. Consultancies, freelancers and
# start-ups are deliberately left out: working there says nothing about a sector.
EMPLOYER_SECTOR = {
    "Santander Tecnología": "Banca y Finanzas",
    "CaixaBank Tech": "Banca y Finanzas",
    "BBVA Technology": "Banca y Finanzas",
    "Banco regional": "Banca y Finanzas",
    "Aseguradora": "Seguros",
    "Administración Pública": "Sector Público",
    "Retailer internacional": "Retail y Consumo",
    "Inditex Tech": "Retail y Consumo",
    "Utility energética": "Energía y Utilities",
    "Operadora de telecomunicaciones": "Telecomunicaciones y Media",
    "Telefónica Tech": "Telecomunicaciones y Media",
    "Orange": "Telecomunicaciones y Media",
    "Vodafone": "Telecomunicaciones y Media",
    "Amadeus": "Turismo y Ocio",
}

# How much a matched catalog skill counts towards a requirement, by match type.
MATCH_WEIGHT = {
    "exact": 1.0,
    "equivalent": 0.9,
    "related": 0.55,
    "transferable": 0.35,
}

# Requirement weights in the fit score.
IMPORTANCE_WEIGHT = {"must": 3.0, "nice": 1.0}
SOFT_FACTOR = 0.5  # soft skills are self-declared and weakly informative
ROLE_FIT_WEIGHT = 1.5
SENIORITY_WEIGHT = 1.5
# Must-haves don't compensate for each other: people are ranked by must-haves shown first, then fit.
COVERED = 0.7
PARTIAL = 0.3


# Cloud platforms and the catalog skills that belong to them. Used to split checklist items that
# mix a capability with a platform ("Kubernetes on Azure" -> "Container orchestration" + "Azure").
PLATFORMS = {
    "Azure": {
        "label": "Azure",
        "base": "Azure",
        "variants": {"Azure", "AKS", "Azure DevOps", "Azure Data Factory", "Azure OpenAI", "Azure Synapse",
                     "Azure Monitor", "Azure IoT Hub", "Bicep", "ARM Templates", "Entra ID"},
        "words": ["Microsoft Azure", "Azure"],
    },
    "AWS": {
        "label": "AWS",
        "base": "AWS",
        "variants": {"AWS", "EKS", "Lambda", "AWS Glue", "CloudFormation", "CloudWatch", "AWS IoT"},
        "words": ["Amazon Web Services", "AWS"],
    },
    "Google Cloud": {
        "label": "Google Cloud (GCP)",
        "base": "Google Cloud",
        "variants": {"Google Cloud", "GKE", "BigQuery", "Cloud Run"},
        "words": ["Google Cloud Platform", "Google Cloud", "GCP"],
    },
}
