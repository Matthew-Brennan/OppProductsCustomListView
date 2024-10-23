// oppProductsTable.js
import { LightningElement, track, wire } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { updateRecord } from 'lightning/uiRecordApi';
import getOppProds from '@salesforce/apex/OppProdListViewController.getOppProds';
import updateRows from '@salesforce/apex/OppProdListViewController.updateRows';

// Import the ID field
import ID_FIELD from '@salesforce/schema/OpportunityLineItem.Id';
import PRODUCT_DETAILS_FIELD from '@salesforce/schema/OpportunityLineItem.Product_Details__c';
import EXPIRATION_DATE_FIELD from '@salesforce/schema/OpportunityLineItem.Product_Expiration_Date__c';
import WARRANTY_YEARS_FIELD from '@salesforce/schema/OpportunityLineItem.Warranty_yrs__c';

const PAGE_SIZE = 100;

export default class OppProductsTable extends LightningElement {

    hideCheckboxColumn = false;
    showRowNumberColumn = false;

    @track data = [];
    @track columns = [
        { 
            label: 'Opportunity Name', 
            fieldName: 'opportunityName', 
            type: 'text',
            editable: false // Cannot edit this as it's a relationship field
        },
        { 
            label: 'Product Details', 
            fieldName: 'productDetails', 
            type: 'text',
            editable: true
        },
        { 
            label: 'Product Expiration Date', 
            fieldName: 'expirationDate', 
            type: 'date',
            typeAttributes: {
                year: 'numeric',
                month: 'long',
                day: '2-digit'
            },
            editable: true
        },
        { 
            label: 'Warranty (Years)', 
            fieldName: 'warrantyYears', 
            type: 'number',
            editable: true,
            cellAttributes: { alignment: 'left' }
        },
        { 
            label: 'Product Name', 
            fieldName: 'productName', 
            type: 'text',
            editable: false // Cannot edit this as it's a relationship field
        }
    ];

    @track pageNumber = 1;
    @track totalPages = 0;
    @track pageRecords = [];
    @track isLoading = true;
    @track error;
    @track draftValues = [];
    @track selectedRows = [];

    // Wire the Apex method
    @wire(getOppProds)
    wiredOppProducts({ error, data }) {
        if (data) {
            this.processRecords(data);
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.data = [];
            this.pageRecords = [];
            console.error('Error:', error);
        }
        this.isLoading = false;
    }

    processRecords(oppLineItems) {
        this.data = oppLineItems.map(item => {
            return {
                id: item.Id,
                opportunityName: item.Opportunity.Name,
                productName: item.Product2.Name,
                productDetails: item.Product_Details__c,
                expirationDate: item.Product_Expiration_Date__c,
                warrantyYears: item.Warranty_yrs__c,
                recordId: item.Id // Adding recordId for selection tracking
            };
        });
        
        this.totalPages = Math.ceil(this.data.length / PAGE_SIZE);
        this.updatePageRecords();
    }

    handleRowSelection(event) {
        const selectedRows = event.detail.selectedRows;
        this.selectedRows = selectedRows;
        console.log('Selected Rows:', this.selectedRows);
    }

    async handleSave(event) {
        this.isLoading = true;
        const records = [];
        
        event.detail.draftValues.forEach(draftValue => {
            const fields = {};
            fields[ID_FIELD.fieldApiName] = draftValue.id;
            console.log(JSON.stringify(event.detail.draftValues));
            if (draftValue.hasOwnProperty('productDetails')) {
                fields[PRODUCT_DETAILS_FIELD.fieldApiName] = draftValue.productDetails;
                console.log(draftValue.productDetails);
            }
            if (draftValue.hasOwnProperty('expirationDate')) {
                fields[EXPIRATION_DATE_FIELD.fieldApiName] = draftValue.expirationDate;
                console.log(draftValue.expirationDate);
            }
            if (draftValue.hasOwnProperty('warrantyYears')) {
                fields[WARRANTY_YEARS_FIELD.fieldApiName] = draftValue.warrantyYears;
                console.log(draftValue.warrantyYears);
            }
            console.log(fields);
            records.push({ fields });
        });
    
        console.log('Record Data:', JSON.stringify(records));
        try {
            const promises = records.map(recordInput => updateRecord(recordInput));
            await Promise.all(promises);
    
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Success',
                    message: 'Records updated successfully',
                    variant: 'success'
                })
            );
    
            // Clear draft values
            this.draftValues = [];
    
            // Refresh the data
            const result = await getOppProds();
            this.processRecords(result);
    
        } catch (error) {
            // Improved error logging and handling
            console.error('Error updating records:', error);
            let errorMessage = 'Error updating records';  // Default error message
    
            // Check for different error structures
            // if (error && error.body && error.body.message) {
            //     errorMessage = error.body.message;
            // } else if (error && error.message) {
            //     errorMessage = error.message;
            // }
            if (error && error.body && error.body.output && error.body.output.fieldErrors) {
                console.error('Field Errors:', error.body.output.fieldErrors);
            }
    
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error',
                    message: errorMessage,
                    variant: 'error'
                })
            );
        } finally {
            this.isLoading = false;
        }
        
    }

    handleBulkAction() {
        if (this.selectedRows.length === 0) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Warning',
                    message: 'Please select at least one record',
                    variant: 'warning'
                })
            );
            return;
        }
        // Add your bulk action logic here
        console.log('Selected Records for Bulk Action:', this.selectedRows);
    }

    previousPage() {
        if (this.pageNumber > 1) {
            this.pageNumber--;
            this.updatePageRecords();
        }
    }

    nextPage() {
        if (this.pageNumber < this.totalPages) {
            this.pageNumber++;
            this.updatePageRecords();
        }
    }

    firstPage() {
        this.pageNumber = 1;
        this.updatePageRecords();
    }

    lastPage() {
        this.pageNumber = this.totalPages;
        this.updatePageRecords();
    }

    updatePageRecords() {
        const start = (this.pageNumber - 1) * PAGE_SIZE;
        const end = this.pageNumber * PAGE_SIZE;
        this.pageRecords = this.data.slice(start, end);
    }

    get isFirstPage() {
        return this.pageNumber === 1;
    }

    get isLastPage() {
        return this.pageNumber === this.totalPages;
    }

    get currentPageInfo() {
        const start = ((this.pageNumber - 1) * PAGE_SIZE) + 1;
        const end = Math.min(this.pageNumber * PAGE_SIZE, this.data.length);
        return `Showing ${start}-${end} of ${this.data.length} records`;
    }

    get hasSelectedRows() {
        return this.selectedRows.length === 0;
    }

    get noError() {
        return !this.error;
    }

    handleRowAction(event) {
        const action = event.detail.action;
        const row = event.detail.row;
        switch (action.name) {
            case 'view_details':
                this.navigateToRecordPage(row.Id);
                break;
            default:
                break;
        }
    }
}