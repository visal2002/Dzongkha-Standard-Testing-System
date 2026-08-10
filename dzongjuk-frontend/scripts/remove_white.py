from PIL import Image

def remove_white(input_path, output_path):
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Change all white (also shades of white)
        # to transparent
        if item[0] > 230 and item[1] > 230 and item[2] > 230:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

remove_white("public/images/logo of DCDD.jpg", "public/images/logo of DCDD.png")
print("Image background removed.")
