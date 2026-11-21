"""Example briefs shown in the UI.

The three official test briefs were not included in the data download, so these are our
own reconstructions of what each one tests (per the case PDF), plus the example from the
case brief itself. They are labelled as examples in the UI.
"""

EXAMPLES = [
    {
        "id": "banking",
        "title": "Core banking migration to the cloud",
        "tests": "Multi-role team, implicit banking experience",
        "brief": (
            "We are migrating a bank's core banking platform from the mainframe to Azure. "
            "We need a team: a Cloud Architect to design the landing zone and the migration, "
            "two Mainframe COBOL developers who know the legacy system, a Data Engineer to "
            "migrate and reconcile the data, and a Project Manager to run the programme with the client. "
            "Everyone should be free within the next 3 months."
        ),
    },
    {
        "id": "retail",
        "title": "AI assistant for retail",
        "tests": "Must-have vs nice-to-have",
        "brief": (
            "We are building a GenAI shopping assistant for a large retail client. We need a Senior AI "
            "Engineer with hands-on experience building RAG solutions and LLM agents in Python. A good "
            "level of English is required. Experience in the retail sector would be nice but is not "
            "essential. Azure OpenAI knowledge is a plus."
        ),
    },
    {
        "id": "cyber",
        "title": "Cybersecurity in the public sector",
        "tests": "Hard filters: available now, 3+ years",
        "brief": (
            "A Spanish public administration needs to reinforce its cybersecurity. We need a SOC analyst "
            "for threat detection and incident response, and a security consultant to align the "
            "organisation with ENS and NIS2. Both must be available immediately and have at least 3 years "
            "of total experience. Public sector experience is preferred."
        ),
    },
    {
        "id": "case",
        "title": "Senior AI Engineer on Azure",
        "tests": "Example from the case brief",
        "brief": (
            "We need a Senior AI Engineer with experience developing RAG solutions and agents on Azure, "
            "a good level of English and experience working directly with clients."
        ),
    },
    {
        "id": "gcp",
        "title": "Data Engineer with GCP",
        "tests": "Hidden talent in another department",
        "brief": (
            "We need a Data Engineer with GCP experience to build BigQuery data pipelines for an "
            "insurance client. Should be able to start within the next couple of months."
        ),
    },
]
