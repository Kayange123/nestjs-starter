export type TPermissionType = {
  displayName: string;
  genericName: string;
  module: string;
};

/**
 * Generates an array of permission objects by combining actions with resources.
 * 
 * @param actions - An array of action strings (e.g., 'create', 'read', 'update', 'delete')
 * @param resources - An array of resource strings (e.g., 'user', 'post', 'comment')
 * @returns An array of permission objects, each containing displayName, genericName, and module properties
 * 
 * @example
 * Returns permissions like [{displayName: 'create:user', genericName: 'create user', module: 'users'}, ...]
 * const permissions = generateResourcePermissions(['create', 'read'], ['user', 'post']);
 */
export const generateResourcePermissions=(actions: string[], resources: string[])=>{
    const permissions: TPermissionType[] = []
    for(const action of actions ){
        for(const resource of resources ){
            const genericName = `${action}:${resource}`.toLowerCase();
            const displayName = `${action} ${resource}`;
            const module = resource?.endsWith('s') ?  resource : `${resource}s`;

            permissions.push({
                displayName,
                genericName,
                module, 
            });
        }
    }

    return permissions;
}