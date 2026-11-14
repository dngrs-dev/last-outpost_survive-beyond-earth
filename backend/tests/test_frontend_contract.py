from export_frontend_fixtures import generate


def test_committed_frontend_fixtures_match_the_real_api():
    generate(check=True)
