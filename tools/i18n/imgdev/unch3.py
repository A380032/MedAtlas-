import sys,subprocess
from multiprocessing import Pool
import importlib.util
spec=importlib.util.spec_from_file_location("u","unch2.py")
src=open("unch2.py").read().split("for nm in sys.argv[1:]:")[0]
exec(src)
def f(nm):
    try: r=one(nm)
    except Exception as ex: return nm,[("ERR",str(ex))]
    return nm,[b for b in r if b[4]<0.35 and 15.5<=b[6]<45 and b[5]>=80]
if __name__=="__main__":
    names=[l.strip() for l in open(sys.argv[1])]
    with Pool(2) as p:
        for nm,r in p.imap(f,names):
            for b in r: print(nm,*b,flush=True)
    print("TOTAL")
