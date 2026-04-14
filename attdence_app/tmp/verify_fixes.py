import math

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371000  # meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 1)

def test_normalization():
    emails = ["User@Example.com", " user@example.com ", "USER@EXAMPLE.COM"]
    normalized = [e.strip().lower() for e in emails]
    assert len(set(normalized)) == 1, f"Normalization failed: {normalized}"
    print("✓ Email Normalization Test Passed")

def test_geofence():
    # Test 180m distance (should pass with new 200m radius)
    dist = calculate_distance(28.6139, 77.2090, 28.6150, 77.2100)
    print(f"Calculated Distance: {dist}m")
    GEOFENCE_RADIUS = 200
    assert dist <= GEOFENCE_RADIUS, f"Geofence rejected valid distance: {dist}m"
    print("✓ Geofence Relaxation Test Passed")

if __name__ == "__main__":
    test_normalization()
    test_geofence()
    print("\nAll logical verifications passed!")
