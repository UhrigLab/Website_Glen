from flask import Blueprint, jsonify, request, redirect, current_app, render_template
from flask.helpers import send_file
from zipfile import ZipFile
import io
from os.path import basename

from werkzeug.exceptions import InternalServerError
#import py-fasta-validator # for validating fasta files
from api.utils import get_max_cookie, get_cookie_info, cleanup_cookies

import os, subprocess, base64, glob

#DEVELOPMENT
api_path = "api/api/"
#PRODUCTION
# api_path = "api/"

#DEVELOPMENT
virtual_env = "api/api/propplotenvDEV/"
#PRODUCTION
# virtual_env = "api/propplotenv/"

file_path = api_path + "tmp/"
example_file_path = api_path + "examples/"
example_fasta_file = "TAFIIsample_NAR_MS.fa"


main = Blueprint('main', __name__, static_folder="../build", static_url_path='/')

#TODO fix error handling
@main.errorhandler(InternalServerError)
def handle_500(e):
    original = getattr(e, "original_exception", None)

    # if original is None:
    #     # direct 500 error, such as abort(500)
    #     return render_template("500.html"), 500

    # wrapped unhandled error
    return render_template("500.html", e=original), 500
@main.errorhandler(404)
def handle_404(e):
    return render_template("404.html", e=e), 404

@main.route('/')
def index():
    return main.send_static_file('index.html')

@main.route('/api/testFasta')
def test_fasta():
    return send_file(os.path.abspath(example_file_path + example_fasta_file), as_attachment=True)
# @main.route('/api/testResults')
# def test_results():
#     result_id = "example"
#     result_zip = ZipFile(example_file_path + result_id + '.zip', 'w')

#     for f in glob.glob(example_file_path+result_id+'*.pdf'):
#         result_zip.write(f, basename(f))
#         print("added pdf: " + f)
#     for f in glob.glob(example_file_path+result_id+'*.tsv'):
#         result_zip.write(f, basename(f))
#         print('added tsv: ' + f)
#     for f in glob.glob(example_file_path+result_id+'*.txt'):
#         result_zip.write(f, basename(f))
#     for f in glob.glob(example_file_path+'README.md'):
#         result_zip.write(f, basename(f))
#     result_zip.close()

#     return send_file(os.path.abspath(example_file_path + result_id + '.zip'), as_attachment=True)

@main.route('/api/color-files/<username>', methods=['GET'])
def colorFiles(username):
    result_id = username
    color_file = open(os.path.abspath(file_path+result_id+"_domain_color_file.txt"), 'r')
    lines = color_file.readlines()

    return jsonify({'colorGroups' : lines})


@main.route('/api/images/<username>', methods=['GET'])
def images(username):
    result_id = username
    images = []
    for f in glob.glob(os.path.abspath(file_path+result_id+'*.pdf')):
        file_id = f.split("tmp/")[1]
        file_id = file_id.split("_")[0]
        if result_id == file_id:
            file = open(f, 'rb')
            b64_bytes = base64.b64encode(file.read())
            image_file = b64_bytes.decode("utf-8")
            images.append({"resultID" : result_id, "file" : image_file})
            print("added image: " + f)
            file.close()
    max_cookie = get_max_cookie(file_path, result_id)
    #TODO swap temp with correct
    #temp
    if len(images) < 3 and max_cookie:
        if get_cookie_info(file_path, result_id, max_cookie):
            return jsonify({'failed' : max_cookie, 'info' : " ".join(get_cookie_info(file_path, result_id, max_cookie).split())})
        else:
            return jsonify({'failed' : max_cookie})
    elif len(images) < 3:
        return jsonify({'failed' : 'null'})
    else:
        cleanup_cookies(file_path, result_id)
        return jsonify({'images' : images})
    #correct
    # if len(images) == 0 and max_cookie:
    #     if get_cookie_info(result_id, max_cookie):
    #         return jsonify({'failed' : max_cookie, 'info' : " ".join(get_cookie_info(result_id, max_cookie).split())})
    #     else:
    #         return jsonify({'failed' : max_cookie})
    # elif len(images) == 0:
    #     return jsonify({'failed' : 'null'})
    # else:
    #     cleanup_cookies(result_id)
    #     return jsonify({'images' : images})

@main.route('/api/sendfiles', methods=['POST'])
def sendfiles():
    # retrieve the fasta file from the POST
    result_id = ""
    fasta_file = None
    fasta_filename = None
    fp = file_path
    i=0 # the first key will always be the result id, and its value will always be the fasta file
    for key in request.files.keys():
        if i==0:
            #retrieve fasta file
            result_id=key
            fasta_file=request.files[key]
            #Check for spaces in the filename before saving
            fasta_filename = "".join(fasta_file.filename.split(" "))
            fasta_file.save(os.path.abspath(file_path + fasta_filename))
            break
    if fasta_file == None:
        for key in request.form.keys():
            if i==0:
                result_id=key
                if request.form[key] == "test":
                    fasta_filename = example_fasta_file
                    fp = example_file_path
                    print("Test fasta file being used")
                else:
                    # This section is for if the user pasted their fasta file rather than uploading a file.
                    # file_path will be the regular one
                    fasta_filename = key + ".fa"
                    fa_text = request.form[key]
                    fa_file = open(os.path.abspath(file_path + fasta_filename), 'w')
                    fa_file.write(fa_text)
                    fa_file.close()
                    print("Fasta file: " + fasta_filename + " will be used.")
                break
        

    # retrieve the 4 parameters
    absolute_results=request.form["absoluteResults"]
    ar = "0"
    if absolute_results == "true": # will be true or false, but the script needs 0 or 1
        ar = "1"
    cutoff = request.form["cutoff"]
    max_cutoff = request.form["maxCutoff"]
    scale_figure = request.form["scaleFigure"]
    custom_scaling = "1"
    if scale_figure == "1":
        custom_scaling = "0" 

    # Set up the call for Pascals script here
    call = virtual_env +  "bin/python " + api_path + "propplot_v1_2.py " + "-id " + result_id + " -in " + fp + fasta_filename + " -sf " + file_path + " -dbf " + api_path + "dbs/" + " -ar " + ar + " -cut " + cutoff + " -mcut " + max_cutoff + " -cs " + custom_scaling + " -api " + scale_figure
    
    # try to retrieve the other 3 files, if they exist
    protein_groups_file = None
    color_file = None
    ignore_domains_file = None
    try:
        protein_groups_file = request.files["proteinGroups"]
        protein_groups_file.save(os.path.abspath(file_path + protein_groups_file.filename))
        call = call + ' -gf ' + file_path + protein_groups_file.filename
    except:
        print("no protein groups file")
    try:
        color_file = request.files["colorFile"]
        color_file.save(os.path.abspath(file_path + color_file.filename))
        call = call + ' -cf ' + file_path + color_file.filename
    except:
        print("no color file")
    try:
        ignore_domains_file = request.files["ignoreDomains"]
        ignore_domains_file.save(os.path.abspath(file_path + ignore_domains_file.filename))
        call = call + ' -if ' + ignore_domains_file.filename
    except:
        print("no ignore domains file")
 
    #send the call
    subprocess.Popen(call, shell=True)

    return "Done", 201


@main.route('/api/download/<username>', methods=['GET', 'POST'])
def download(username):
    result_id = username
    result_zip = ZipFile(file_path + result_id + '.zip', 'w')

    for f in glob.glob(file_path+result_id+'*.pdf'):
        result_zip.write(f, basename(f))
        print("added pdf: " + f)
    for f in glob.glob(file_path+result_id+'*.tsv'):
        result_zip.write(f, basename(f))
        print('added tsv: ' + f)
    for f in glob.glob(file_path+result_id+'*.txt'):
        result_zip.write(f, basename(f))
    for f in glob.glob(example_file_path+'README.md'):
        result_zip.write(f, basename(f))
    result_zip.close()
    
    return send_file(os.path.abspath(file_path + result_id + '.zip'), as_attachment=True)

#after request [POST] requests only
#validate file exists, if it does, delete file
