import urllib.request
import re
import json

def crawl_kbo_v2():
    url = "https://www.koreabaseball.com/TeamRank/Team/Rank.aspx"
    headers = {'User-Agent': 'Mozilla/5.0'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
        
        # Look for the standings table tbody
        tbody_match = re.search(r'<table[^>]*class="tData01[^>]*>.*?<tbody>(.*?)</tbody>', html, re.DOTALL)
        if not tbody_match:
            print("Could not find standings table.")
            return None
            
        rows = re.findall(r'<tr>(.*?)</tr>', tbody_match.group(1), re.DOTALL)
        standings = []
        
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
                
                emojis = {
                    "KIA": "🐯", "LG": "⚾", "삼성": "🦁", "두산": "🐻", "KT": "🧙",
                    "SSG": "🚀", "롯데": "⚓", "한화": "🦅", "NC": "🦖", "키움": "🦸"
                }
                
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
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    data = crawl_kbo_v2()
    if data:
        with open('kbo_2026_data.json', 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=4)
        print("Successfully crawled data from KBO Rank page.")
    else:
        print("Falling back to manual update.")
