public with sharing class OppProdListViewController {

    @AuraEnabled(cacheable=true)
    public static List<OpportunityLineItem> getOppProds(){
        return [SELECT Opportunity.Name,
        Product2.Name,
        Product_Details__c,
        Product_Expiration_Date__c,
        Warranty_yrs__c
        
        FROM OpportunityLineItem
        WHERE Opportunity.StageName NOT IN (
            'Created',
            'Price Quote',
            'Quote Generated',
            'Quote Sent', 
            'Lost Sale',
            'Full RMA'
        )
        AND (
            Product2.Name LIKE '%Licenses%'
            OR Product2.Name LIKE '%Software%'
            OR Product2.Name LIKE '%Switch/Firewall%'
        ) 
        AND Opportunity.Account.Name != 'Axiom LTD'
        AND CreatedDate >= 2021-08-01T00:00:00Z
        AND Vendor_Account__r.Name != 'Microsoft'
         ];
    }

    // Updates the checklist items with the changes provided in the data parameter
    // Object data: a stringifyed JSON of the checklist items to update 
    @AuraEnabled  // Enables this method to be called from Aura or LWC
    public static string updateRows(Object data) {
        // Deserialize the provided data into a list of Checklist_Item__c records
        List<OpportunityLineItem> rowsForUpdate = (List<OpportunityLineItem>) JSON.deserialize(
            JSON.serialize(data),
            List<OpportunityLineItem>.class
        );

        try {
            // Update the checklist items with the deserialized data
            update rowsForUpdate;
            return 'Success: Rows updated successfully';
        } catch (Exception e) {
            // Return an error message if an exception occurs during the update
            return 'The following exception has occurred: ' + e.getMessage();
        }
    }
}