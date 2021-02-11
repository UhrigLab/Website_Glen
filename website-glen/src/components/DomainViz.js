import React, { useState } from 'react';
//import request from 'utils/Request'; TODO refactor to remove burden from ProtPlot.js
import axios from 'axios';
import UploadFile from './UploadFile';
import AccordionSetup from './AccordionSetup';
import { isFileFasta } from './utils/ValidateInputs';
import { isStringFasta } from './utils/ValidateInputs';
import { downloadTestFastaFile } from './utils/HTTPRequests';

import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import { Button, Checkbox, Divider, FormControlLabel, TextField, Typography } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { useHistory } from 'react-router';
import DomainVizIcon from './img/domainviz.png';
import { SketchPicker } from 'react-color';


const useStyles = makeStyles((theme) => ({
    root: {
        flexGrow: 1,
    },
    button: {
        padding: theme.spacing(1),
        textAlign: 'center',
    },
    paper: {
        padding: theme.spacing(2),
        textAlign: 'center',
        color: theme.palette.text.secondary,
    },
    divider: {
        scale: 1.5,
        backgroundColor: 'black',
    },
    img: {
        height: "122px",
        width: "293px"
    },
    colorPicker: {
        position: 'fixed',
        top: '0px',
        right: '0px',
        bottom: '0px',
        left: '0px',
    }
}));
const guid = () => {
    //generates random id;
    const s4 = () => {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    //return id of format 'aaaaaaaa'.'aaaa'.'aaaa'.'aaaa'.'aaaaaaaaaaaa'
    return s4() + s4() + '.' + s4() + '.' + s4() + '.' + s4() + '.' + s4() + s4() + s4();
}

function ProtPlot() {
    //temp for production
    function getImages() {
        let id = textFields.uidTextField;
        if (!id) {
            alert("Please enter a result ID.");
            return;
        }
        if (id.length != 36) {
            alert("Please enter a valid result ID, this ID is the wrong length.");
            return;
        }
        if (id.match('^[a-z0-9.]*$') == null) {
            alert("Please enter a valid result ID, this ID has the wrong characters.")
            return;
        }
        let idSplit = id.split('.')
        if (idSplit.length != 5 || idSplit[0].length != 8 || idSplit[1].length != 4 || idSplit[2].length != 4 
            || idSplit[3].length != 4 || idSplit[4].length != 12) {
            alert("Please enter a valid result ID, this ID isn't formatted correctly.")
            return
        }
        history.push('/view-results/' + textFields.uidTextField);
    }
    //end of temp
    const classes = useStyles();
    const resultID = guid();
    const history = useHistory()

    const [fastaFile, setFastaFile] = useState(null);

    const [showColorPicker, setShowColorPicker] = useState(false);
    function handleColorPicker() {
        setShowColorPicker(!showColorPicker);
    }
    const [cfColor, setCfColor] = useState('#fff'); // cfColor is one of the colors that will be used to generate a colorfile
    const handleCfColorChange = (color) => {
        setCfColor(color.hex)
    }

    const [checkboxes, setCheckboxes] = useState({
        absoluteResultsCheckbox: false,
        fastaFileLoadedCheckbox: false,
        scaleFigureCheckbox: false,
    });
    const handleCheckBox = (event) => {
        setCheckboxes({ ...checkboxes, [event.target.name]: event.target.checked });
    };

    const [textFields, setTextFields] = useState({
        cutoffTextField: '0.05',
        maxCutoffTextField: '0.05',
        scaleFigureTextField: '1',
        fastaTextField: '',
    });
    const handleTextField = (event) => {
        setTextFields({ ...textFields, [event.target.name]: event.target.value })
    }

    function uploadTestFastaFile() {
        // This function sends dummy info to the backend, so that it knows which file to use
        setFastaFile({
            file: "test",
            name: "test"
        });
    }
    function clearFastaFile() {
        // TODO Make clear button clear textfield as well
        setFastaFile(null);
        setTextFields({...textFields, [textFields.fastaTextField]: ''})
    }
    async function validateFastaText() {
        let valid = true;
        await isStringFasta(textFields.fastaTextField).then((result) => {
            valid = result;
        });
        if (valid) {
            setFastaFile({
                file: textFields.fastaTextField,
                name: "manual"
            });
        }
        else {
            return;
        }
        alert("Text accepted as fasta file.")
    }
    async function handleFastaFile(file) {
        //Validate fastaFile:
        let valid = true;

        // Check that the file is a fasta file
        await isFileFasta(file).then((result) => {
            valid = result;
        });

        if (valid) {
            setFastaFile(file);
            alert("Sucessfully uploaded file: " + file.name)
        }
        else {
            return;
        }
    }

    async function sendDomainvizFiles() {
        //Save file to server so the backend can access it 
        const data = new FormData();

        if (fastaFile == null) {
            if (textFields.fastaTextField == '') {
                alert("Please upload a file, or paste the fasta text into the text field before clicking \"Submit Task\".");
                return;
            }
            else {
                alert("Please Validate your text before clicking \"Submit Task\".")
                return
            }
        }
        if (fastaFile.name === "test") {
            data.append(resultID, fastaFile.name)
        }
        else if (fastaFile.name === "manual") {
            data.append(resultID, fastaFile.file)
        }
        else {
            data.append(resultID, fastaFile, fastaFile.name);
        }


        if (checkboxes.absoluteResultsCheckbox) {
            data.append('absoluteResults', checkboxes.absoluteResultsCheckbox);
        }
        else {
            data.append('absoluteResults', checkboxes.absoluteResultsCheckbox);
        }
        if (textFields.cutoffTextField !== '') {
            if (parseFloat(textFields.cutoffTextField) < 0 || parseFloat(textFields.cutoffTextField) > 1) {
                alert("Please enter a valid minimum domain prevalence value, or remove it.");
                return;
            }
            else {
                data.append('cutoff', parseFloat(textFields.cutoffTextField));
            }
        }
        if (textFields.maxCutoffTextField !== '') {
            if (parseFloat(textFields.maxCutoffTextField) < 0 || parseFloat(textFields.maxCutoffTextField) > 1) {
                alert("Please enter a valid minimum domain position conservation value, or remove it.");
                return;
            }
            else {
                data.append('maxCutoff', parseFloat(textFields.maxCutoffTextField));
            }
        }
        if (textFields.scaleFigureTextField !== '') {
            if (parseFloat(textFields.scaleFigureTextField) < 0 || parseFloat(textFields.scaleFigureTextField) > 10) {
                alert("Please enter a valid figure scaling value.");
                return;
            }
            else {
                data.append('scaleFigure', parseFloat(textFields.scaleFigureTextField));
            }
        }
        await axios.post('/api/sendfiles', data, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        }).then(response => {
            console.log(response);
            textFields.scaleFigureTextField = '';
            textFields.maxCutoffTextField = '';
            textFields.cutoffTextField = '';
            checkboxes.absoluteResultsCheckbox = false;
            history.push("/view-results/" + resultID);
        }).catch(error => {
            console.log(error);
            alert("Oh dear. Something has gone wrong.")
        });
    }

    return (
        <div className='protplot'>
            <Grid className={classes.root} container spacing={3} alignItems='center' justify='center' style={{marginTop: '90px'}}>
                <Grid item xs={12}>
                    <img src={DomainVizIcon} className={classes.img} alt='Logo'></img>
                </Grid>
                <Grid item xs={12}>
                    <Paper className={classes.paper} variant='outlined'>
                        <Typography variant='h5'>Protein domain search {'&'} visualization tool</Typography>
                        <Typography variant='body1'>Use DomainViz by first uploading a protein Fasta file, changing any options as desired and clicking "Submit Task".</Typography>
                    </Paper>
                </Grid>

                <Grid item xs={2} />
                <Grid item xs={3}>
                    <AccordionSetup id='fastatxt' header='Fasta File' body='The file needs to contain fasta sequences in files named either .fa or .fasta.'></AccordionSetup>
                </Grid>
                <Grid item xs={2}>
                    <UploadFile value='fasta' handleFile={handleFastaFile} acceptedTypes='.fa,.fasta' />
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={uploadTestFastaFile} style={{ marginLeft: "10px" }}>Load Example</Button>
                </Grid>
                <Grid item xs={1}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={clearFastaFile} >Clear File</Button>
                </Grid>
                <Grid item xs={1}>
                    <Checkbox disabled style={{ color: 'green' }} checked={(fastaFile == null) ? false : true} name="fastaFileLoadedCheckbox" />
                </Grid>
                <Grid item xs={3}/>

                <Grid item xs={2}/>
                <Grid item xs={6} >
                    <TextField id="fasta-textfield"  name='fastaTextField' label="Fasta File" placeholder="Paste Text Here" multiline fullWidth rowsMax={5} variant='outlined' value={textFields.fastaTextField} onChange={handleTextField} />
                </Grid>
                <Grid item xs={1}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={validateFastaText} >Validate Text</Button>
                </Grid>
                <Grid item xs={3}/>

                <Grid item xs={2} />
                <Grid item xs={6}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={downloadTestFastaFile}>Download Example</Button>
                </Grid>
                <Grid item xs={4}/>

                <Grid item xs={12}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={handleColorPicker}>Pick A Color</Button>
                    
                </Grid>
                <Grid item xs={3}/>
                <Grid item xs={4}>
                    {(showColorPicker) &&
                        <SketchPicker color={ cfColor } onChangeComplete={ handleCfColorChange }/>
                    }
                </Grid>
                <Grid item xs={12} />



                <Grid item xs={3}>
                    <AccordionSetup id='cutofftxt' header='Minimum domain prevalence' body='Enter a number between 0 and 1. The default value is 0.05. Only domains occuring in a ratio higher than the number are plotted (e.g. If the value is 0.5, the domain has to occur somewhere in the protein of at least 50% of sequences).'></AccordionSetup>
                </Grid>
                <Grid item xs={2}>
                    <TextField id='cutoff' name='cutoffTextField' value={textFields.cutoffTextField} type='number' inputProps={{ step: '0.01', max: 1, min: 0 }} onChange={handleTextField} />
                </Grid>
                <Grid item xs={3}>
                    <AccordionSetup id='max-cutofftxt' header='Minimum domain position conservation' body='Enter a number between 0 and 1. The default value is 0.05. Only domains that have a maximum prevalence at a relative place in the protein group above this ratio are plotted (e.g. if value is 0.5, 50% of the sequences have to have this domain at the same relative position).'></AccordionSetup>
                </Grid>
                <Grid item xs={2}>
                    <TextField id='max-cutoff' name='maxCutoffTextField' value={textFields.maxCutoffTextField} type='number' inputProps={{ step: '0.01', max: 1, min: 0 }} onChange={handleTextField} />
                </Grid>

                <Grid item xs={3}>
                    <AccordionSetup id='scale-figuretxt' header='Figure Scaling' body='This parameter is disabled by default. Click the checkbox to enable figure scaling. Enter a number between 0 and 10. The default value is 1, but this may not reflect well in your plots, and it is recommended that you leave it off. The number you input represents the number of inches per 100pb that the plot is used to display.'></AccordionSetup>
                </Grid>
                <Grid item xs={1}>
                    <TextField disabled={(checkboxes.scaleFigureCheckbox) ? false : true} id='scale-figure' name='scaleFigureTextField' value={textFields.scaleFigureTextField} type='number' inputProps={{ min: 0, max: 10, step: '0.1' }} onChange={handleTextField} />
                </Grid>
                <Grid item xs={1}>
                    <FormControlLabel
                        control={<Checkbox checked={checkboxes.scaleFigureCheckbox} onChange={handleCheckBox} name="scaleFigureCheckbox" />}
                        label="Yes" />
                </Grid>
                <Grid item xs={3}>
                    <AccordionSetup id='absoluteresultstxt' header='Absolute y-axis?' body='Click the checkbox if you want absolute results on the y-axis. The default is no. Absolute results means that we will plot absolute numbers on y axis of plots instead of relative ones. If the box is unchecked, we plot relative results, if it is checked, we plot absolute results.'></AccordionSetup>
                </Grid>
                <Grid item xs={2}>
                    <FormControlLabel
                        control={<Checkbox checked={checkboxes.absoluteResultsCheckbox} onChange={handleCheckBox} name="absoluteResultsCheckbox" />}
                        label="Yes" />
                </Grid>

                <Grid item xs={12}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={sendDomainvizFiles}>
                        Submit Task
                    </Button>
                </Grid>

                <Grid item xs={6}>
                    <Divider className={classes.divider}></Divider>
                </Grid>

                {/* temp for production */}
                <Grid item xs={12} />
                <Grid item xs={12} />
                <Grid item xs={5}>
                    <Typography variant='body1'>Already have a code? Enter it here:</Typography>
                </Grid>
                <Grid item xs={3}>
                    <TextField fullWidth id='uid' name='uidTextField' value={textFields.uidTextField} label='Result ID' type="text" onChange={handleTextField} />
                </Grid>
                <Grid item xs={4}>
                    <Button variant='contained' color='default' component='span' className={classes.button} onClick={getImages}>Go to my Results</Button>
                </Grid>
                {/* end of temp */}
            </Grid>
        </div>
    );
}

export default ProtPlot;