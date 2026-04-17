# Team-3 Risk Scoring Methodology <br />

This dashboard visualises relative lithium battery fire impact risk across Glasgow using a weighted scoring model.

Each area is assigned a composite risk score based on multiple factors, including building characteristics, population vulnerability, and emergency response constraints. Not all factors contribute equally, each is given a priority weight based on its importance to life safety.

Priority Levels
Critical (High weight)
Factors that directly increase risk to life, such as:
vulnerable populations (e.g. care homes, elderly residents)
older or high-density buildings (e.g. tenements)
indicators of lithium battery presence
Major (Medium weight)
Factors that significantly amplify risk:
deprivation levels
limited access or longer emergency response times
dense urban environments
Contributing (Lower weight)
Contextual factors that add additional risk:
proximity to charging hubs
nearby industrial or fuel-related land use
Scoring Approach

Each factor is assigned:

a local score (how strongly it applies in that area)
a priority weight (how important the factor is overall)

These are combined to produce a final score:

Risk Score = Σ (factor score × priority weight)

Interpretation

The map displays risk using a colour scale:

🔴 Red: highest relative impact risk
🟠 Orange: high risk
🟡 Yellow: moderate risk
🟢 Green: lower risk

Areas appear as high risk when multiple high-priority factors overlap. For example, dense older housing with vulnerable residents and slower emergency access.

This model is designed as a decision-support tool, helping identify where lithium battery fires would have the greatest potential impact, not just where they are most likely to occur.

Community Awareness & Education

In addition to risk mapping, this project includes an educational layer designed for the wider community — not just fire services.

The goal is to translate complex risk insights into clear, actionable guidance for residents, families, and local organisations.

Lithium Battery Safety

We provide simple guidance on:

Safe charging practices (e.g. avoid overnight charging, use approved chargers)
Proper storage (keep away from heat and flammable materials)
Correct disposal methods (never dispose of batteries in general waste)
Guidance for High-Risk Areas

For users located in higher-risk zones, the dashboard highlights:

Practical steps to reduce risk at home
Awareness of shared building risks (e.g. stairwells in tenements)
Recommendations for safer charging and storage behaviours
Guidance for Nurseries & Care Settings

Recognising increased vulnerability in certain environments, we include tailored advice for:

Nurseries and childcare providers
Care homes and assisted living facilities

This includes:

Safe storage of devices and batteries
Charging supervision policies
Emergency preparedness and evacuation awareness

<br /> The code ("Code") in this repository was created solely by the student teams during a coding competition hosted by JPMorgan Chase Bank, N.A. ("JPMC"). JPMC did not create or contribute to the development of the Code. This Code is provided AS IS and JPMC makes no warranty of any kind, express or implied, as to the Code, including but not limited to, merchantability, satisfactory quality, non-infringement, title or fitness for a particular purpose or use.