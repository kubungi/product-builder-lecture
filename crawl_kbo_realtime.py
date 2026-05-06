import urllib.request
import re
import json
import sys

def fetch_kbo_data():
    url = "https://www.koreabaseball.com/Default.aspx"
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
            
        # The standings are usually in a table with class="reb_rank" or similar on the main page
        # Let's try to find the team names and stats using regex
        # Pattern: <td>순위</td> <td>팀명</td> ...
        
        # Searching for the rank table rows
        # Example pattern for team rank on main page: 
        # <tr>
        #     <td>1</td>
        #     <td class="team"><span>KIA</span></td>
        #     <td>144</td>
        #     ...
        
        standings = []
        
        # Extracting rows from the rank table
        # We look for <tr>...</tr> inside the rank table area
        rank_table_match = re.search(r'<table[^>]*class="side-rank"[^>]*>(.*?)</table>', html, re.DOTALL)
        if not rank_table_match:
            # Try another common class if not found
            rank_table_match = re.search(r'<div[^>]*class="rank-scroll"[^>]*>(.*?)</div>', html, re.DOTALL)

        if rank_table_match:
            table_content = rank_table_match.group(1)
            rows = re.findall(r'<tr>(.*?)</tr>', table_content, re.DOTALL)
            
            for row in rows:
                cols = re.findall(r'<td>(.*?)</td>', row, re.DOTALL)
                if len(cols) >= 5:
                    rank = re.sub(r'<[^>]*>', '', cols[0]).strip()
                    team_html = cols[1]
                    team_name = re.sub(r'<[^>]*>', '', team_html).strip()
                    games = re.sub(r'<[^>]*>', '', cols[2]).strip()
                    wins = re.sub(r'<[^>]*>', '', cols[3]).strip()
                    losses = re.sub(r'<[^>]*>', '', cols[4]).strip()
                    
                    # Some versions have draws and win rate in the next columns
                    draws = "0"
                    pct = "0.000"
                    if len(cols) >= 7:
                        draws = re.sub(r'<[^>]*>', '', cols[5]).strip()
                        pct = re.sub(r'<[^>]*>', '', cols[6]).strip()

                    # Mapping emojis
                    emojis = {
                        "KIA": "🐯", "LG": "⚾", "삼성": "🦁", "두산": "🐻", "KT": "🧙",
                        "SSG": "🚀", "롯데": "⚓", "한화": "🦅", "NC": "🦖", "키움": "🦸"
                    }
                    logo = emojis.get(team_name, "⚾")

                    standings.append({
                        "rank": int(rank),
                        "team": team_name,
                        "logo": logo,
                        "g": int(games),
                        "w": int(wins),
                        "l": int(losses),
                        "d": int(draws),
                        "pct": pct,
                        "gb": "0.0", # Simplified
                        "strk": "-"
                    })
        
        if not standings:
            # If parsing failed, fallback to a more robust way or provide a structured error
            print("Failed to parse standings from HTML.")
            return None

        return standings

    except Exception as e:
        print(f"Error during crawling: {e}")
        return None

if __name__ == "__main__":
    data = fetch_kbo_data()
    if data:
        with open('kbo_2026_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Successfully crawled real-time data from KBO website.")
    else:
        sys.exit(1)
