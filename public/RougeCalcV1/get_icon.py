import requests
from bs4 import BeautifulSoup

def get_favicon_url(url):
    try:
        response = requests.get(url)
        if response.status_code == 200:
            soup = BeautifulSoup(response.text, 'html.parser')
            icon_link = soup.find("link", rel="icon")
            if icon_link:
                return icon_link['href']
            else:
                return "No icon found"
    except requests.RequestException as e:
        return str(e)

url = "https://viktorlab.cn/akdata/dps/"
favicon_url = get_favicon_url(url)
print(favicon_url)
