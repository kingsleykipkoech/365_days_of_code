import os
import sys
import json
import subprocess
from datetime import datetime
from collections import Counter

LOG_FILE = "tracker/log.json"
START_DATE = datetime(2026, 5, 4)

# File extension to Topic mapping
TOPIC_MAP = {
    ".c": "C Programming",
    ".h": "C Headers / Systems",
    ".rs": "Rust",
    ".go": "Go",
    ".py": "Python",
    ".asm": "Assembly",
    ".s": "Assembly",
    ".js": "JavaScript",
    ".html": "Web Fundamentals",
    ".css": "Styling",
    ".sh": "Shell Scripting",
    ".md": "Documentation",
}

def get_current_day():
    now = datetime.now()
    diff = (now.date() - START_DATE.date()).days
    return max(1, diff + 1)

def run_cmd(cmd):
    try:
        return subprocess.check_output(cmd, shell=True, text=True).strip()
    except Exception:
        return ""

def generate_magic_log():
    # Get last commit details
    commit_hash = run_cmd("git log -1 --format=%H")
    if not commit_hash:
        print("No git commits found.")
        return

    commit_title = run_cmd("git log -1 --format=%s")
    commit_body = run_cmd("git log -1 --format=%b")
    
    # Get files changed in the last commit
    files_changed = run_cmd("git show --name-only --format= %s").split('\n')[1:]
    files_changed = [f.strip() for f in files_changed if f.strip()]
    
    # Determine the topic
    extensions = [os.path.splitext(f)[1] for f in files_changed]
    if extensions:
        most_common_ext = Counter(extensions).most_common(1)[0][0]
        topic = TOPIC_MAP.get(most_common_ext, "General Engineering")
    else:
        topic = "General Engineering"

    # Format the content
    content = commit_body if commit_body else f"Automagic log entry for commit {commit_hash[:7]}. Modified {len(files_changed)} files."

    now = datetime.now()
    entry = {
        "id": commit_hash,
        "dayNumber": get_current_day(),
        "date": now.strftime("%b %-d, %Y"),
        "topic": topic,
        "title": commit_title,
        "content": content,
        "timestamp": now.isoformat()
    }

    # Save to JSON
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, 'r') as f:
                logs = json.load(f)
        except json.JSONDecodeError:
            pass
    
    # Check if this commit is already logged
    if any(l.get("id") == commit_hash for l in logs):
        print("This commit is already logged.")
        return

    logs.insert(0, entry)
    
    # Optional: Keep only the latest log per day if you want strict 1/day, 
    # but allowing multiple is fine for intense days.

    with open(LOG_FILE, 'w') as f:
        json.dump(logs, f, indent=2)
    
    print(f"✨ Auto-Magic Log Created!")
    print(f"Day: {entry['dayNumber']}")
    print(f"Topic: {entry['topic']}")
    print(f"Title: {entry['title']}")

if __name__ == "__main__":
    generate_magic_log()
