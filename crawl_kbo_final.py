import urllib.request
import re
import json

def fetch_kbo_official():
    url = "https://www.koreabaseball.com/Default.aspx"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
        
        # Finding the rank rows in the 'side-rank' table
        # Structure: <tr> <td>1</td> <td class="team"><span>KIA</span></td> <td>66</td> <td>42</td> <td>2</td> </tr>
        pattern = r'<tr>\s*<td>(\d+)</td>\s*<td class="team"><span>(.*?)</span></td>\s*<td>(\d+)</td>\s*<td>(\d+)</td>\s*<td>(\d+)</td>'
        matches = re.findall(pattern, html)
        
        if not matches:
            # Try alternative pattern without spans
            pattern = r'<tr>\s*<td>(\d+)</td>\s*<td class="team">(.*?)</td>\s*<td>(\d+)</td>\s*<td>(\d+)</td>\s*<td>(\d+)</td>'
            matches = re.findall(pattern, html)

        standings = []
        emojis = {
            "KIA": "🐯", "LG": "⚾", "삼성": "🦁", "두산": "🐻", "KT": "🧙",
            "SSG": "🚀", "롯데": "⚓", "한화": "🦅", "NC": "🦖", "키움": "🦸"
        }

        for m in matches:
            rank, team, g, w, l = m
            # Calculate simple pct
            win_val = int(w)
            loss_val = int(l)
            pct = win_val / (win_val + loss_val) if (win_val + loss_val) > 0 else 0
            
            standings.append({
                "rank": int(rank),
                "team": team,
                "logo": emojis.get(team, "⚾"),
                "g": int(g),
                "w": int(w),
                "l": int(l),
                "d": 0, # Defaulting draw
                "pct": f"{pct:.3f}",
                "gb": "0.0",
                "strk": "-"
            })
            
        return standings

    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    data = fetch_kbo_official()
    if data:
        with open('kbo_2026_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Successfully crawled data from KBO official home.")
    else:
        print("Failed to crawl. Using simulation data.")
