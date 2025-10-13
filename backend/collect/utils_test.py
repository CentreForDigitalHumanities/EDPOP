from collect.utils import _name_to_slug


def test_name_to_slug():
    test_cases = [
        ('Test!!', 'test'),
        ('Test test test', 'test_test_test'),
        ('test/test?test=test&testing=true', 'testtesttesttesttestingtrue'),
        ('https://example.com', 'httpsexamplecom'),
        ('Alice\'s favourite books 📚️😊', 'alices_favourite_books'),
        ('*?!##)', ''),
        ('Test\n\n\tTest\n', 'test_test'),
    ]

    for value, expected in test_cases:
        assert _name_to_slug(value) == expected
