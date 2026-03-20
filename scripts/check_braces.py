import sys

def check_brackets(filename):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    stack = []
    line = 1
    col = 1
    for i, char in enumerate(content):
        if char == '\n':
            line += 1
            col = 1
        else:
            col += 1
            
        if char == '{':
            stack.append(('{', line, col))
        elif char == '}':
            if not stack:
                print(f"Extra '}}' found at line {line}, col {col}")
                return
            stack.pop()
    
    if stack:
        for char, l, c in stack:
            print(f"Unclosed '{char}' from line {l}, col {c}")
    else:
        print("Brackets are balanced!")

if __name__ == "__main__":
    check_brackets(sys.argv[1])
