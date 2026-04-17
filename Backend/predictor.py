import numpy as np
from sklearn.cluster import KMeans
from sklearn.linear_model import LinearRegression
from sklearn.metrics import silhouette_samples

from .risk_engine import score_all_zones

CLUSTER_LABELS = {0: "low_risk", 1: "medium_risk", 2: "high_risk"}


def build_feature_matrix(zones: list) -> np.ndarray:
    return np.array([
        [
            z["scores"]["building"],
            z["scores"]["lithium"],
            z["scores"]["human"],
            z["scores"]["chemical"],
            z["scores"]["fire_infra"],
        ]
        for z in zones
    ])


def run_ml(zones: list) -> list:
    X = build_feature_matrix(zones)
    y = np.array([z["composite_risk"] for z in zones])

    # 1. K-Means clustering — 3 groups
    kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
    cluster_ids = kmeans.fit_predict(X)

    # --- ADD THIS: Calculate the "tightness" of the clusters ---
    # This generates a list of numbers, one for each zone
    raw_silhouette_scores = silhouette_samples(X, cluster_ids)

    # Scale from (-1 to 1) to (0 to 1) so it's a standard percentage
    sample_confidences = (raw_silhouette_scores + 1) / 2
    # -----------------------------------------------------------

    # 2. Sort clusters by centroid mean so 0=low, 1=med, 2=high
    centroid_means = kmeans.cluster_centers_.mean(axis=1)
    order = np.argsort(centroid_means)
    remap = {old: new for new, old in enumerate(order)}
    cluster_ids = np.array([remap[c] for c in cluster_ids])

    # 3. Linear regression — predicts composite risk from raw scores
    reg = LinearRegression()
    reg.fit(X, y)
    predicted = reg.predict(X)

    result = []
    for i, zone in enumerate(zones):
        # 4. Get AI confidence (if it exists, else assume 1.0)
        ai_conf = zone.get("ai_confidence", 1.0)

        # 5. Get the ML confidence for THIS specific zone
        ml_conf = float(sample_confidences[i])

        # 6. UNIFY THEM: 70% source quality, 30% model quality
        unified_conf = (ai_conf * 0.7) + (ml_conf * 0.3)

        result.append({
            **zone,
            "cluster": int(cluster_ids[i]),
            "cluster_label": CLUSTER_LABELS[int(cluster_ids[i])],
            "predicted_risk": round(float(predicted[i]), 2),
            "reliability_score": round(unified_conf, 2)  # <--- SEND THIS TO FRONTEND
        })

    return result


if __name__ == "__main__":
    zones = score_all_zones()
    enriched = run_ml(zones)
    for z in enriched:
        print(z["postcode"], z["risk_level"], f"cluster={z['cluster_label']}", f"predicted={z['predicted_risk']}")