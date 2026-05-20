import csv
import io

def parse_wbs_csv(file_content):
    # Expects columns: WBS_ID, Name, Progress, RACI, Start_Date, End_Date
    tasks = []
    stream = io.StringIO(file_content.decode("UTF8"), newline=None)
    reader = csv.DictReader(stream)
    for row in reader:
        wbs_id = row.get('WBS_ID', '').strip()
        tasks.append({
            "wbs_id": wbs_id,
            "name": row.get('Name', 'Unnamed Task'),
            "progress": row.get('Progress', '0%'),
            "raci": row.get('RACI', 'Unassigned'),
            "start_date": row.get('Start_Date', ''),
            "end_date": row.get('End_Date', ''),
            "is_parent": '.' not in wbs_id
        })
    return tasks