import re
import json

def parse_kbo_html():
    try:
        with open('kbo_raw.html', 'r', encoding='utf-8') as f:
            html = f.read()
        
        # Searching for the table with class "tData01" or a similar one that has the standings
        # Based on previous results, we look for a table structure in the tbody
        # It's usually something like: <tr> <td>1</td> <td>KIA</td> <td>144</td> <td>87</td> <td>55</td> <td>2</td> <td>0.613</td> ...
        
        # Let's find the main table first
        table_pattern = r'<table[^>]*class="tData01[^>]*>.*?<tbody>(.*?)</tbody>'
        table_match = re.search(table_pattern, html, re.DOTALL)
        
        if not table_match:
            print("Standings table not found in raw HTML.")
            return None
        
        tbody_content = table_match.group(1)
        # Extracting each row
        rows = re.findall(r'<tr>(.*?)</tr>', tbody_content, re.DOTALL)
        
        standings = []
        emojis = {
            "KIA": "🐯", "LG": "⚾", "삼성": "🦁", "두산": "🐻", "KT": "🧙",
            "SSG": "🚀", "롯데": "⚓", "한화": "🦅", "NC": "🦖", "키움": "🦸"
        }

        for row in rows:
            cols = re.findall(r'<td>(.*?)</td>', row, re.DOTALL)
            if len(cols) >= 10:
                rank = re.sub(r'<[^>]*>', '', cols[0]).strip()
                team = re.sub(r'<[^>]*>', '', cols[1]).strip()
                g = re.sub(r'<[^>]*>', '', cols[2]).strip()
                w = re.sub(r'<[^>]*>', '', cols[3]).strip()
                l = re.sub(r'<[^>]*>', '', cols[4]).strip()
                d = re.sub(r'<[^>]*>', '', cols[5]).strip()
                pct = re.sub(r'<[^>]*>', '', cols[6]).strip()
                gb = re.sub(r'<[^>]*>', '', cols[7]).strip()
                strk = re.sub(r'<[^>]*>', '', cols[8]).strip()
                
                standings.append({
                    "rank": int(rank),
                    "team": team,
                    "logo": emojis.get(team, "⚾"),
                    "g": int(g),
                    "w": int(w),
                    "l": int(l),
                    "d": int(d),
                    "pct": pct,
                    "gb": gb,
                    "strk": strk
                })
        
        return standings

    except Exception as e:
        print(f"Parsing error: {e}")
        return None

if __name__ == "__main__":
    data = parse_kbo_html()
    if data:
        with open('kbo_2026_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Successfully parsed and updated KBO standings.")
    else:
        print("Failed to parse standings from the downloaded file.")
