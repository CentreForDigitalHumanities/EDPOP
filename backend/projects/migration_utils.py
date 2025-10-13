import re

def name_to_slug(name: str, max_length: int = 64) -> str:
    lowercase = name.lower()
    no_whitespace = re.sub(r'\s', '_', lowercase)
    cleaned = re.sub(r'[^a-z_]', '', no_whitespace)
    return cleaned[:min(max_length, len(cleaned))]